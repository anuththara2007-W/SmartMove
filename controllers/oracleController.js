const { oracledb } = require('../config/oracle');

// --- Helper Functions ---
// Reuse a database connection and handle errors, rollback, and cleanup.
const withConnection = async (req, res, action, errorMessage = 'Database operation failed') => {
    let connection;

    try {
        connection = await oracledb.getConnection();
        await action(connection, req, res);
    } catch (err) {
        console.error(err);

        // Roll back uncommitted changes if an error occurs.
        if (connection) {
            try {
                await connection.rollback();
            } catch (e) {
                console.error(e);
            }
        }

        // Avoid sending a second response if headers were already sent.
        if (!res.headersSent) {
            res.status(err.status || 500).json({
                error: err.customMessage || errorMessage
            });
        }
    } finally {
        // Release the database connection after the operation.
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

// Execute an SQL query and return rows as JavaScript objects.
const executeQuery = async (connection, query, params = {}, autoCommit = false) => {
    return await connection.execute(query, params, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit
    });
};

// Create a reusable controller for fetching records.
const fetchAll = (query, errorMessage) => async (req, res) => {
    await withConnection(req, res, async (connection) => {
        const result = await executeQuery(connection, query);
        res.json(result.rows);
    }, errorMessage);
};

// Create a reusable controller for deleting a record by its ID.
const deleteRecord = (tableName, idCol, errorMsg) => async (req, res) => {
    await withConnection(req, res, async (connection) => {
        try {
            await executeQuery(
                connection,
                `DELETE FROM ${tableName} WHERE ${idCol} = :id`,
                { id: req.params.id },
                true
            );

            res.json({ message: 'Record deleted successfully' });
        } catch (err) {
            // Handle foreign-key errors when other records reference this record.
            if (err.message && err.message.includes('ORA-02292')) {
                return res.status(400).json({
                    error: 'Cannot delete record because it is referenced by other system records.'
                });
            }

            throw err;
        }
    }, errorMsg);
};

// --- Routes ---
const getRoutes = async (req, res) => {
    await withConnection(req, res, async (connection) => {
        const isPopularOnly = req.query.popular === 'true';
        let query = `SELECT * FROM Routes`;
        //Creates the initial SQL query to retrieve all columns from the Routes table.
        if (isPopularOnly) {
            query += ` WHERE NVL(IsPopular, 'N') = 'Y'`; //nvl eplaces a NULL value in IsPopular with 'N'.
        }
        query += ` ORDER BY RouteID ASC`;
        try {
            const result = await executeQuery(connection, query);
            res.json(result.rows);
        } catch (err) {
            /*Checks whether popular-only filtering was requested and Oracle returned ORA-00904, 
            which commonly indicates an invalid identifier, such as a missing or incorrectly named column.*/
            if (isPopularOnly && (err.message && err.message.includes('ORA-00904'))) {
                console.warn('IsPopular column missing in Routes, falling back to all routes');
                const fallbackResult = await executeQuery(connection, `SELECT * FROM Routes ORDER BY RouteID ASC`);
                return res.json(fallbackResult.rows);
            }
            throw err;
        }
    }, 'Failed to fetch routes');
};
const deleteRoute = deleteRecord('Routes', 'RouteID', 'Failed to delete route');

const createRoute = async (req, res) => {
    //Open the database connection
    await withConnection(req, res, async (conn) => {
        const { startLocation, endLocation, distanceKm, estimatedDuration, isPopular } = req.body;
        /*Uses the ternary operator to determine the value stored in popularFlag.
- If isPopular is 'N' or false, the value becomes 'N'.
- Otherwise, it becomes 'Y'.*/
        const popularFlag = (isPopular === 'N' || isPopular === false) ? 'N' : 'Y';
        const result = await executeQuery(conn,
            `INSERT INTO Routes (StartLocation, EndLocation, DistanceKm, EstimatedDuration, IsPopular) 
             VALUES (:startLocation, :endLocation, :distanceKm, :estimatedDuration, :popularFlag) 
             RETURNING RouteID INTO :outId`,
            {
                startLocation,
                endLocation,
                distanceKm: distanceKm || 10,
                estimatedDuration: estimatedDuration || 30,
                popularFlag,
                outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }, true
        );
        res.status(201).json({ message: 'Route created successfully', routeId: result.outBinds.outId[0] }); //retrieves the generated route ID from the inserted record.
    }, 'Failed to create route');
};

const updateRoute = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { startLocation, endLocation, distanceKm, estimatedDuration, isPopular } = req.body;
        let updateQuery = `UPDATE Routes SET StartLocation = :startLocation, EndLocation = :endLocation, DistanceKm = :distanceKm, EstimatedDuration = :estimatedDuration`;
        const params = { startLocation, endLocation, distanceKm: distanceKm || 10, estimatedDuration: estimatedDuration || 30, id: req.params.id };
        if (isPopular !== undefined) {
            // += is used to append something to the existing value of a variable.
            updateQuery += `, IsPopular = :isPopular`;
            params.isPopular = isPopular;
        }
        updateQuery += ` WHERE RouteID = :id`;
        await executeQuery(conn, updateQuery, params, true);
        res.json({ message: 'Route updated successfully' });
    }, 'Failed to update route');
};

// --- Tickets / Bookings ---
const bookTicket = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { passengerID, routeID, tripID: providedTripID, amount, paymentMethod, seatNumber } = req.body;
        let tripID = providedTripID;
        let fare = amount || 15.00;

        // Auto-assign trip if missing
        if (!tripID && routeID) {
            // Find an active trip that is Scheduled or In Progress on this route (ignore completed/cancelled)
            const tripRes = await executeQuery(conn, `
                SELECT TripID, NVL(BaseFare, 15) AS BASEFARE 
                FROM (
                    SELECT TripID, BaseFare 
                    FROM Trips 
                    WHERE RouteID = :routeID 
                    AND LOWER(TRIM(TripStatus)) NOT IN ('completed', 'cancelled')
                    ORDER BY DepartureDateTime ASC
                ) WHERE ROWNUM = 1
            `, { routeID });

            // Check whether the trip query returned any records.
            if (tripRes.rows && tripRes.rows.length > 0) {
                // Get the trip ID, supporting both uppercase and camelCase column names.
                tripID = tripRes.rows[0].TRIPID || tripRes.rows[0].tripId;

                // Get the base fare or keep the existing fare as a fallback.
                fare = tripRes.rows[0].BASEFARE || tripRes.rows[0].baseFare || fare;
            } else {  // If previous trips are completed or none exist, select an AVAILABLE vehicle
                const availVehRes = await executeQuery(conn, `
                    SELECT VehicleID FROM Vehicles v
                    WHERE Status = 'Active'
                    AND NOT EXISTS (
                        SELECT 1 FROM Trips t 
                        WHERE t.VehicleID = v.VehicleID 
                        AND LOWER(TRIM(t.TripStatus)) NOT IN ('completed', 'cancelled')
                    )
                    ORDER BY VehicleID ASC
                `);

                // Get the vehicle ID if an available vehicle was found; otherwise, use null.
                let vid = (availVehRes.rows && availVehRes.rows.length > 0)
                    ? availVehRes.rows[0].VEHICLEID
                    : null;

                // If no vehicle ID was found, search for the smallest ID of an active vehicle.
                if (!vid) {
                    const fallbackVeh = await executeQuery(
                        conn,
                        `SELECT MIN(VehicleID) AS VID FROM Vehicles WHERE Status = 'Active'`
                    );

                    // Use the retrieved vehicle ID, or default to 1 if no ID is available.
                    vid = fallbackVeh.rows[0]?.VID || 1;
                }

                const driverRes = await executeQuery(conn, `
                    SELECT DriverID FROM Drivers d
                    WHERE Status = 'Active'
                    AND NOT EXISTS (
                        SELECT 1 FROM Trips t 
                        WHERE t.DriverID = d.DriverID 
                        AND LOWER(TRIM(t.TripStatus)) NOT IN ('completed', 'cancelled')
                    )
                    ORDER BY DriverID ASC
                `);
                let did = (driverRes.rows && driverRes.rows.length > 0) ? driverRes.rows[0].DRIVERID : 1;

                const newTripRes = await conn.execute(`
                    INSERT INTO Trips (RouteID, VehicleID, DriverID, DepartureDateTime, ArrivalDateTime, TripStatus, BaseFare)
                    VALUES (:routeID, :vid, :did, SYSTIMESTAMP + INTERVAL '1' DAY, SYSTIMESTAMP + INTERVAL '2' DAY, 'Scheduled', 15)
                    RETURNING TripID INTO :outTripID
                `, { routeID, vid, did, outTripID: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }, { autoCommit: false });

                tripID = newTripRes.outBinds.outTripID[0];
            }
        } else if (tripID) {
            const fareRes = await executeQuery(conn, `SELECT NVL(BaseFare, 15) AS BASEFARE FROM Trips WHERE TripID = :tripID`, { tripID });
            if (fareRes.rows.length > 0 && fareRes.rows[0].BASEFARE) {
                fare = fareRes.rows[0].BASEFARE;
            }
        } else {
            tripID = routeID || 1;
        }

        const validMethod = ['Card', 'Cash', 'Bank Transfer'].includes(paymentMethod) ? paymentMethod : 'Card';
        const assignedSeat = seatNumber || '1A';

        const result = await conn.execute(`
            INSERT INTO Tickets (TripID, PassengerID, SeatNumber, BookingDate, FareAmount, TicketStatus) 
            VALUES (:tripID, :passengerID, :assignedSeat, SYSDATE, :fare, 'Booked')
            RETURNING TicketID INTO :outTicketID
        `, {
            tripID, passengerID, assignedSeat, fare,
            outTicketID: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: false });

        const ticketID = result.outBinds.outTicketID[0];

        await executeQuery(conn, `
            INSERT INTO Payments (TicketID, Amount, PaymentDate, Method, PaymentStatus) 
            VALUES (:ticketID, :fare, SYSDATE, :validMethod, 'Completed')
        `, { ticketID, fare, validMethod }, true);

        res.status(201).json({ message: 'Ticket booked successfully', fare });
    }, 'Failed to book ticket');
};

const getTickets = fetchAll(`
    SELECT tk.TicketID, tk.TripID, tk.PassengerID, tk.SeatNumber, tk.FareAmount, tk.TicketStatus,
           p.FirstName, p.LastName, p.Phone, t.DepartureDateTime, r.StartLocation, r.EndLocation
    FROM Tickets tk
    JOIN Passengers p ON tk.PassengerID = p.PassengerID
    JOIN Trips t ON tk.TripID = t.TripID
    JOIN Routes r ON t.RouteID = r.RouteID
    ORDER BY tk.TicketID DESC
`, 'Failed to fetch tickets');

const updateTicketStatus = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { ticketID } = req.params;
        let { newStatus } = req.body;

        if (!newStatus) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Normalize / map 'Confirmed' to 'Booked' if sent from UI
        if (newStatus === 'Confirmed') {
            newStatus = 'Booked';
        }

        const allowedStatuses = ['Booked', 'Cancelled', 'Completed'];
        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                error: `Invalid status: ${newStatus}. Allowed: ${allowedStatuses.join(', ')}`
            });
        }

        // PL/SQL Block executing business logic to update status
        await conn.execute(`
            BEGIN
                -- Update the status of the specific ticket in the Tickets table
                UPDATE Tickets 
                SET TicketStatus = :newStatus 
                WHERE TicketID = :ticketID;
                
                -- Save the changes permanently to the database
                COMMIT;
            END;
        `, { newStatus, ticketID: Number(ticketID) || ticketID }, { autoCommit: false });

        res.json({ message: 'Ticket status updated via PL/SQL block' });
    }, 'Failed to update ticket status');
};

// --- Reports ---
const getRevenue = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { startDate, endDate } = req.query;
        const result = await conn.execute(`
            DECLARE
                -- Declare a cursor to fetch ticket prices one by one
                CURSOR ticket_prices_cursor IS 
                    SELECT FareAmount FROM Tickets 
                    WHERE TicketStatus IN ('Booked', 'Completed');
                
                current_ticket_price NUMBER;
                total_calculated_revenue NUMBER := 0;
            BEGIN
                -- Open the cursor to start reading
                OPEN ticket_prices_cursor;
                
                -- Loop through every ticket price
                LOOP
                    FETCH ticket_prices_cursor INTO current_ticket_price;
                    
                    -- Stop the loop when there are no more tickets
                    EXIT WHEN ticket_prices_cursor%NOTFOUND;
                    
                    -- Add the current ticket price to the total revenue
                    total_calculated_revenue := total_calculated_revenue + NVL(current_ticket_price, 0);
                END LOOP;
                
                -- Close the cursor after we are done
                CLOSE ticket_prices_cursor;
                
                -- Return the final calculated value
                :ret := total_calculated_revenue;
            EXCEPTION
                WHEN OTHERS THEN
                    -- If any error happens, return 0
                    :ret := 0;
            END;
        `, {
            ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });
        res.json({ totalRevenue: result.outBinds.ret });
    }, 'Failed to calculate revenue');
};

const getFrequentRoutes = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const result = await conn.execute(
            `BEGIN
                -- Open a cursor (a set of rows) and link it to the output variable :cursor
                -- This will send the data back to our NodeJS application
                OPEN :cursor FOR
                    SELECT r.RouteID AS ROUTEID, (r.StartLocation || ' to ' || r.EndLocation) AS ROUTENAME, 
                           COUNT(DISTINCT t.TripID) AS TRIPCOUNT, r.DistanceKm AS DISTANCEKM, r.EstimatedDuration AS ESTIMATEDDURATION
                    FROM Routes r
                    LEFT JOIN Trips t ON r.RouteID = t.RouteID
                    GROUP BY r.RouteID, r.StartLocation, r.EndLocation, r.DistanceKm, r.EstimatedDuration
                    ORDER BY TRIPCOUNT DESC, r.RouteID ASC;
                    
            EXCEPTION
                WHEN OTHERS THEN 
                    -- If any error occurs during the query, throw the error
                    RAISE;
            END;`,
            {
                cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );
        const resultSet = result.outBinds.cursor;
        const rows = await resultSet.getRows();
        await resultSet.close();

        const formattedRows = (rows || []).map(r => {
            if (Array.isArray(r)) {
                return {
                    ROUTEID: r[0],
                    ROUTENAME: r[1],
                    TRIPCOUNT: r[2] || 0,
                    DISTANCEKM: r[3],
                    ESTIMATEDDURATION: r[4]
                };
            }
            return {
                ROUTEID: r.ROUTEID || r.routeId || r.RouteID,
                ROUTENAME: r.ROUTENAME || r.routeName || r.RouteName,
                TRIPCOUNT: r.TRIPCOUNT ?? r.tripCount ?? r.TripCount ?? 0,
                DISTANCEKM: r.DISTANCEKM ?? r.distanceKm,
                ESTIMATEDDURATION: r.ESTIMATEDDURATION ?? r.estimatedDuration
            };
        });
        res.json(formattedRows);
    }, 'Failed to fetch frequent routes');
};

const getPassengerHistory = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { passengerId } = req.params;
        const result = await conn.execute(
            `DECLARE
                -- Human readable variable to count if the passenger exists
                number_of_matching_passengers NUMBER;
             BEGIN
                -- First, check if the passenger actually exists in the database
                SELECT COUNT(*) INTO number_of_matching_passengers 
                FROM Passengers 
                WHERE PassengerID = :passengerId;
                
                -- If we found 0 passengers, throw an error message
                IF number_of_matching_passengers = 0 THEN
                    RAISE_APPLICATION_ERROR(-20001, 'Passenger not found.');
                END IF;

                -- Open a cursor (a pointer to a set of rows) and send it back to NodeJS
                OPEN :cursor FOR
                    SELECT t.TicketID, r.StartLocation, r.EndLocation, tr.DepartureDateTime, tr.ArrivalDateTime, t.FareAmount, t.TicketStatus
                    FROM Tickets t
                    JOIN Trips tr ON t.TripID = tr.TripID
                    JOIN Routes r ON tr.RouteID = r.RouteID
                    WHERE t.PassengerID = :passengerId
                    ORDER BY tr.DepartureDateTime DESC;
                    
             EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    -- This happens if no data is found at all
                    RAISE_APPLICATION_ERROR(-20002, 'No data found during travel history retrieval.');
                WHEN OTHERS THEN
                    -- If any other error happens, re-throw it so we can see what went wrong
                    RAISE;
             END;`,
            {
                passengerId,
                cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        const resultSet = result.outBinds.cursor;
        const rows = await resultSet.getRows();
        await resultSet.close();

        const formattedHistory = (rows || []).map(r => {
            if (Array.isArray(r)) {
                return {
                    TICKETID: r[0],
                    TicketID: r[0],
                    STARTLOCATION: r[1],
                    StartLocation: r[1],
                    ENDLOCATION: r[2],
                    EndLocation: r[2],
                    DEPARTUREDATETIME: r[3],
                    DepartureDateTime: r[3],
                    ARRIVALDATETIME: r[4],
                    ArrivalDateTime: r[4],
                    FAREAMOUNT: r[5],
                    FareAmount: r[5],
                    TICKETSTATUS: r[6],
                    TicketStatus: r[6]
                };
            }
            return r;
        });
        res.json(formattedHistory);
    }, 'Failed to retrieve passenger travel history');
};

// --- Payments ---
const getPayments = fetchAll(`SELECT * FROM Payments ORDER BY PAYMENTID DESC`, 'Failed to fetch payments');
const deletePayment = deleteRecord('Payments', 'PAYMENTID', 'Failed to delete payment');

const createPayment = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { ticketID, method, amount } = req.body;
        await executeQuery(conn, `INSERT INTO Payments (TICKETID, PAYMENTMETHOD, AMOUNT, PAYMENTDATE) VALUES (:ticketID, :method, :amount, SYSDATE)`, { ticketID, method, amount }, true);
        res.status(201).json({ message: 'Payment created' });
    }, 'Failed to create payment');
};

const updatePayment = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { method, amount } = req.body;
        await executeQuery(conn, `UPDATE Payments SET PAYMENTMETHOD = :method, AMOUNT = :amount WHERE PAYMENTID = :id`, { method, amount, id: req.params.id }, true);
        res.json({ message: 'Payment updated' });
    }, 'Failed to update payment');
};

// --- Drivers ---
const getDrivers = fetchAll(`SELECT * FROM Drivers ORDER BY DriverID DESC`, 'Failed to fetch drivers');
const deleteDriver = deleteRecord('Drivers', 'DriverID', 'Failed to delete driver');

const createDriver = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { firstName, lastName, licenseNumber, phone, hireDate, status } = req.body;
        await executeQuery(conn, `INSERT INTO Drivers (FirstName, LastName, LicenseNumber, Phone, HireDate, Status) VALUES (:firstName, :lastName, :licenseNumber, :phone, TO_DATE(:hireDate, 'YYYY-MM-DD'), :status)`, { firstName, lastName, licenseNumber, phone, hireDate, status }, true);
        res.status(201).json({ message: 'Driver created successfully' });
    }, 'Failed to create driver');
};

const updateDriver = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { firstName, lastName, licenseNumber, phone, hireDate, status } = req.body;
        await executeQuery(conn, `UPDATE Drivers SET FirstName = :firstName, LastName = :lastName, LicenseNumber = :licenseNumber, Phone = :phone, HireDate = TO_DATE(:hireDate, 'YYYY-MM-DD'), Status = :status WHERE DriverID = :id`, { firstName, lastName, licenseNumber, phone, hireDate, status, id: req.params.id }, true);
        res.json({ message: 'Driver updated successfully' });
    }, 'Failed to update driver');
};

// --- Passengers ---
const getPassengers = fetchAll(`SELECT * FROM Passengers ORDER BY PassengerID DESC`, 'Failed to fetch passengers');
const deletePassenger = deleteRecord('Passengers', 'PassengerID', 'Failed to delete passenger');

const createPassenger = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { firstName, lastName, email, phone } = req.body;

        const check = await executeQuery(conn, `SELECT PassengerID FROM Passengers WHERE Email = :email`, { email: email || '' });
        if (check.rows && check.rows.length > 0) {
            return res.status(200).json({
                message: 'Passenger already exists',
                passengerId: check.rows[0].PASSENGERID || check.rows[0].passengerId
            });
        }

        const result = await executeQuery(conn,
            `INSERT INTO Passengers (FirstName, LastName, Email, Phone, RegisteredDate) VALUES (:firstName, :lastName, :email, :phone, SYSDATE) RETURNING PassengerID INTO :outId`,
            {
                firstName,
                lastName,
                email: email || '',
                phone: phone || '',
                outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }, true
        );
        res.status(201).json({ message: 'Passenger created successfully', passengerId: result.outBinds.outId[0] });
    }, 'Failed to create passenger');
};

const updatePassenger = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { firstName, lastName, email, phone } = req.body;
        await executeQuery(conn, `UPDATE Passengers SET FirstName = :firstName, LastName = :lastName, Email = :email, Phone = :phone WHERE PassengerID = :id`, { firstName, lastName, email, phone, id: req.params.id }, true);
        res.json({ message: 'Passenger updated successfully' });
    }, 'Failed to update passenger');
};

// --- Vehicles ---
const getVehicles = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const onlyAvailable = req.query.available === 'true';
        let query = `
            SELECT v.VehicleID, v.RegNumber, v.VehicleType, v.Capacity, v.Status,
                   NVL((
                       SELECT COUNT(*) FROM Trips t 
                       WHERE t.VehicleID = v.VehicleID 
                       AND LOWER(TRIM(t.TripStatus)) NOT IN ('completed', 'cancelled')
                   ), 0) AS ActiveTripsCount,
                   NVL((
                       SELECT COUNT(*) FROM Trips t 
                       WHERE t.VehicleID = v.VehicleID 
                       AND LOWER(TRIM(t.TripStatus)) = 'completed'
                   ), 0) AS CompletedTripsCount,
                   (
                       SELECT t.TripID FROM Trips t 
                       WHERE t.VehicleID = v.VehicleID 
                       AND LOWER(TRIM(t.TripStatus)) NOT IN ('completed', 'cancelled')
                       ORDER BY CASE WHEN LOWER(TRIM(t.TripStatus)) = 'in progress' THEN 1 ELSE 2 END, t.DepartureDateTime ASC
                       FETCH FIRST 1 ROWS ONLY
                   ) AS CurrentTripID,
                   (
                       SELECT t.TripStatus FROM Trips t 
                       WHERE t.VehicleID = v.VehicleID 
                       AND LOWER(TRIM(t.TripStatus)) NOT IN ('completed', 'cancelled')
                       ORDER BY CASE WHEN LOWER(TRIM(t.TripStatus)) = 'in progress' THEN 1 ELSE 2 END, t.DepartureDateTime ASC
                       FETCH FIRST 1 ROWS ONLY
                   ) AS CurrentTripStatus,
                   (
                       SELECT t.TripID FROM Trips t 
                       WHERE t.VehicleID = v.VehicleID 
                       AND LOWER(TRIM(t.TripStatus)) = 'completed'
                       ORDER BY t.ArrivalDateTime DESC
                       FETCH FIRST 1 ROWS ONLY
                   ) AS LastCompletedTripID
            FROM Vehicles v
        `;
        if (onlyAvailable) {
            query += ` WHERE v.Status = 'Active' AND NOT EXISTS (
                SELECT 1 FROM Trips t 
                WHERE t.VehicleID = v.VehicleID 
                AND LOWER(TRIM(t.TripStatus)) NOT IN ('completed', 'cancelled')
            )`;
        }
        query += ` ORDER BY v.VehicleID DESC`;

        const result = await executeQuery(conn, query);
        const vehicles = (result.rows || []).map(veh => {
            const activeCount = veh.ACTIVETRIPSCOUNT !== undefined ? veh.ACTIVETRIPSCOUNT : (veh.activeTripsCount || 0);
            const currentStatus = veh.CURRENTTRIPSTATUS || veh.currentTripStatus;
            const baseStatus = veh.STATUS || veh.status;

            let operationalStatus = 'Available';
            if (baseStatus !== 'Active') {
                operationalStatus = baseStatus;
            } else if (activeCount > 0) {
                operationalStatus = currentStatus === 'In Progress' ? 'In Progress' : 'Scheduled';
            }

            return {
                ...veh,
                isAvailable: operationalStatus === 'Available',
                operationalStatus
            };
        });

        res.json(vehicles);
    }, 'Failed to fetch vehicles');
};

// --- Trips ---
const getTrips = fetchAll(`
    SELECT t.TripID, t.RouteID, t.VehicleID, t.DriverID, t.DepartureDateTime, t.ArrivalDateTime, t.TripStatus, t.BaseFare,
           r.StartLocation, r.EndLocation, v.RegNumber, v.VehicleType, v.Capacity, d.FirstName as DriverFirstName, d.LastName as DriverLastName
    FROM Trips t
    JOIN Routes r ON t.RouteID = r.RouteID
    JOIN Vehicles v ON t.VehicleID = v.VehicleID
    JOIN Drivers d ON t.DriverID = d.DriverID
    ORDER BY t.DepartureDateTime DESC
`, 'Failed to fetch trips');

const deleteTrip = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { id } = req.params;
        // 1. Delete associated payments for tickets on this trip
        await executeQuery(conn, `
            DELETE FROM Payments WHERE TicketID IN (SELECT TicketID FROM Tickets WHERE TripID = :id)
        `, { id });

        // 2. Delete tickets on this trip
        await executeQuery(conn, `
            DELETE FROM Tickets WHERE TripID = :id
        `, { id });

        // 3. Delete the trip itself
        await executeQuery(conn, `
            DELETE FROM Trips WHERE TripID = :id
        `, { id }, true);

        res.json({ message: 'Trip deleted successfully' });
    }, 'Failed to delete trip');
};

const checkTripConflict = async (conn, driverID, vehicleID, start, end, excludeId = null) => {
    const q = `
        SELECT TripID, VehicleID, DriverID, TripStatus FROM Trips 
        WHERE (DriverID = :driverID OR VehicleID = :vehicleID)
        ${excludeId ? 'AND TripID != :excludeId' : ''}
        AND LOWER(TRIM(TripStatus)) NOT IN ('completed', 'cancelled')
        AND (
            DepartureDateTime < TO_TIMESTAMP(:endDt, 'YYYY-MM-DD"T"HH24:MI') AND 
            ArrivalDateTime > TO_TIMESTAMP(:startDt, 'YYYY-MM-DD"T"HH24:MI')
        )
    `;
    const params = { driverID, vehicleID, startDt: start, endDt: end };
    if (excludeId) params.excludeId = excludeId;

    const conflicts = await executeQuery(conn, q, params);
    if (conflicts.rows.length > 0) {
        const c = conflicts.rows[0];
        const isVeh = c.VEHICLEID == vehicleID;
        const err = new Error();
        err.status = 409;
        err.customMessage = isVeh
            ? `Scheduling conflict: Vehicle #${vehicleID} is currently busy on active Trip #${c.TRIPID} (${c.TRIPSTATUS || 'Active'}). Once that trip is completed, it will be available to book.`
            : `Scheduling conflict: Driver #${driverID} is currently assigned to Trip #${c.TRIPID} during this time.`;
        throw err;
    }
};

const createTrip = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { routeID, vehicleID, driverID, departureDateTime, arrivalDateTime, tripStatus, baseFare } = req.body;
        const fare = baseFare || 15.00;

        await checkTripConflict(conn, driverID, vehicleID, departureDateTime, arrivalDateTime);

        await executeQuery(conn, `
            INSERT INTO Trips (RouteID, VehicleID, DriverID, DepartureDateTime, ArrivalDateTime, TripStatus, BaseFare) 
            VALUES (:routeID, :vehicleID, :driverID, TO_TIMESTAMP(:departureDateTime, 'YYYY-MM-DD"T"HH24:MI'), TO_TIMESTAMP(:arrivalDateTime, 'YYYY-MM-DD"T"HH24:MI'), :tripStatus, :fare)
        `, { routeID, vehicleID, driverID, departureDateTime, arrivalDateTime, tripStatus, fare }, true);

        res.status(201).json({ message: 'Trip created successfully' });
    }, 'Failed to create trip');
};

const updateTrip = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { routeID, vehicleID, driverID, departureDateTime, arrivalDateTime, tripStatus, baseFare } = req.body;
        const fare = baseFare || 15.00;
        const { id } = req.params;

        // If the trip is being marked Completed or Cancelled, it is releasing the vehicle and driver!
        // So conflict check is only needed if the trip is remaining or becoming active.
        if (tripStatus !== 'Completed' && tripStatus !== 'Cancelled') {
            await checkTripConflict(conn, driverID, vehicleID, departureDateTime, arrivalDateTime, id);
        }

        await executeQuery(conn, `
            UPDATE Trips SET RouteID = :routeID, VehicleID = :vehicleID, DriverID = :driverID, 
            DepartureDateTime = TO_TIMESTAMP(:departureDateTime, 'YYYY-MM-DD"T"HH24:MI'), 
            ArrivalDateTime = TO_TIMESTAMP(:arrivalDateTime, 'YYYY-MM-DD"T"HH24:MI'), 
            TripStatus = :tripStatus, BaseFare = :fare WHERE TripID = :id
        `, { routeID, vehicleID, driverID, departureDateTime, arrivalDateTime, tripStatus, fare, id }, true);

        res.json({ message: 'Trip updated successfully' });
    }, 'Failed to update trip');
};

const createVehicle = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { registrationNumber, capacity, model } = req.body;

        const result = await conn.execute(`
            INSERT INTO Vehicles (RegNumber, Capacity, VehicleType, Status) 
            VALUES (:registrationNumber, :capacity, :model, 'Active')
            RETURNING VehicleID INTO :outVehicleID
        `, {
            registrationNumber, capacity, model,
            outVehicleID: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: true });

        const vehicleId = result.outBinds.outVehicleID[0];
        res.status(201).json({ message: 'Vehicle created successfully', vehicleId });
    }, 'Failed to create vehicle');
};

const updateVehicle = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { id } = req.params;
        const { registrationNumber, capacity, model, status } = req.body;

        await conn.execute(`
            UPDATE Vehicles SET RegNumber = :registrationNumber, Capacity = :capacity, VehicleType = :model, Status = :status 
            WHERE VehicleID = :id
        `, { registrationNumber, capacity, model, status, id }, { autoCommit: true });

        res.json({ message: 'Vehicle updated successfully' });
    }, 'Failed to update vehicle');
};

const deleteVehicle = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { id } = req.params;

        try {
            // Check if vehicle exists
            const checkVeh = await executeQuery(conn, `SELECT VehicleID FROM Vehicles WHERE VehicleID = :id`, { id });
            if (!checkVeh.rows || checkVeh.rows.length === 0) {
                return res.status(404).json({ error: `Vehicle #${id} not found.` });
            }

            // Check if vehicle has active trips (Scheduled, In Progress, etc.)
            const activeTripsResult = await executeQuery(conn, `
                SELECT COUNT(*) AS ACTIVECNT FROM Trips 
                WHERE VehicleID = :id AND LOWER(TRIM(TripStatus)) NOT IN ('completed', 'cancelled')
            `, { id });

            const activeCount = (activeTripsResult.rows && activeTripsResult.rows[0]) ? (activeTripsResult.rows[0].ACTIVECNT || 0) : 0;
            if (activeCount > 0) {
                return res.status(400).json({
                    error: `Cannot delete vehicle #${id}: It is currently assigned to ${activeCount} active trip(s) (Scheduled or In Progress). Please cancel or complete them first.`
                });
            }

            // 1. Delete associated maintenance records if any
            await executeQuery(conn, `DELETE FROM Maintenance WHERE VehicleID = :id`, { id });

            // 2. Delete payments for tickets on completed/cancelled trips of this vehicle
            await executeQuery(conn, `
                DELETE FROM Payments WHERE TicketID IN (
                    SELECT TicketID FROM Tickets WHERE TripID IN (SELECT TripID FROM Trips WHERE VehicleID = :id)
                )
            `, { id });

            // 3. Delete tickets for trips of this vehicle
            await executeQuery(conn, `
                DELETE FROM Tickets WHERE TripID IN (SELECT TripID FROM Trips WHERE VehicleID = :id)
            `, { id });

            // 4. Delete trips for this vehicle (all remaining trips are completed/cancelled)
            await executeQuery(conn, `DELETE FROM Trips WHERE VehicleID = :id`, { id });

            // 5. Delete the vehicle itself
            await executeQuery(conn, `DELETE FROM Vehicles WHERE VehicleID = :id`, { id });

            // 6. Explicitly commit Oracle transaction
            await conn.commit();

            // 7. Clean up MongoDB vehicle documents and resource images
            try {
                const VehicleDocument = require('../models/VehicleDocument');
                const ResourceImage = require('../models/ResourceImage');
                await VehicleDocument.deleteMany({ vehicleID: parseInt(id, 10) });
                await ResourceImage.deleteMany({ resourceType: 'vehicle', resourceId: parseInt(id, 10) });
            } catch (mongoErr) {
                console.warn('MongoDB cleanup notice for vehicle:', mongoErr.message);
            }

            res.json({ message: `Vehicle #${id} and associated completed/cancelled records deleted successfully.` });
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            if (error.message && error.message.includes('ORA-02292')) {
                return res.status(400).json({ error: 'Cannot delete vehicle because it is referenced by active records in the database.' });
            }
            throw error;
        }
    }, 'Failed to delete vehicle');
};

// Export controller functions so they can be imported and used in route files
module.exports = {
    getRoutes, createRoute, updateRoute, deleteRoute,
    bookTicket, getTickets, updateTicketStatus,
    getRevenue, getFrequentRoutes,
    getPayments, createPayment, updatePayment, deletePayment,
    getDrivers, createDriver, updateDriver, deleteDriver,
    getPassengers, createPassenger, updatePassenger, deletePassenger, getPassengerHistory,
    getVehicles, createVehicle, updateVehicle, deleteVehicle, getTrips, createTrip, updateTrip, deleteTrip
};
