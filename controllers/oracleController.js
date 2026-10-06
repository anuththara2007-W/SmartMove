const { oracledb } = require('../config/oracle');

// --- Helper Functions ---
const withConnection = async (req, res, action, errorMessage = 'Database operation failed') => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        await action(connection, req, res);
    } catch (err) {
        console.error(err);
        if (connection) {
             try { await connection.rollback(); } catch (e) { console.error(e); }
        }
        if (!res.headersSent) {
            res.status(err.status || 500).json({ error: err.customMessage || errorMessage });
        }
    } finally {
        if (connection) {
            try { await connection.close(); } catch (err) { console.error(err); }
        }
    }
};

const executeQuery = async (connection, query, params = {}, autoCommit = false) => {
    return await connection.execute(query, params, { 
        outFormat: oracledb.OUT_FORMAT_OBJECT, 
        autoCommit 
    });
};

const fetchAll = (query, errorMessage) => async (req, res) => {
    await withConnection(req, res, async (connection) => {
        const result = await executeQuery(connection, query);
        res.json(result.rows);
    }, errorMessage);
};

const deleteRecord = (tableName, idCol, errorMsg) => async (req, res) => {
    await withConnection(req, res, async (connection) => {
        await executeQuery(connection, `DELETE FROM ${tableName} WHERE ${idCol} = :id`, { id: req.params.id }, true);
        res.json({ message: 'Record deleted successfully' });
    }, errorMsg);
};

// --- Routes ---
const getRoutes = fetchAll(`SELECT * FROM Routes`, 'Failed to fetch routes');
const deleteRoute = deleteRecord('Routes', 'RouteID', 'Failed to delete route');

const createRoute = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { startLocation, endLocation, distanceKm, estimatedDuration } = req.body;
        const result = await executeQuery(conn, 
            `INSERT INTO Routes (StartLocation, EndLocation, DistanceKm, EstimatedDuration) VALUES (:startLocation, :endLocation, :distanceKm, :estimatedDuration) RETURNING RouteID INTO :outId`,
            { 
                startLocation, 
                endLocation, 
                distanceKm: distanceKm || 10, 
                estimatedDuration: estimatedDuration || 30,
                outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }, true
        );
        res.status(201).json({ message: 'Route created successfully', routeId: result.outBinds.outId[0] });
    }, 'Failed to create route');
};

const updateRoute = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { startLocation, endLocation, distanceKm, estimatedDuration } = req.body;
        await executeQuery(conn, 
            `UPDATE Routes SET StartLocation = :startLocation, EndLocation = :endLocation, DistanceKm = :distanceKm, EstimatedDuration = :estimatedDuration WHERE RouteID = :id`,
            { startLocation, endLocation, distanceKm, estimatedDuration, id: req.params.id }, true
        );
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
            const tripRes = await executeQuery(conn, `SELECT TripID, NVL(BaseFare, 15) AS BASEFARE FROM (SELECT TripID, BaseFare FROM Trips WHERE RouteID = :routeID ORDER BY TripID DESC) WHERE ROWNUM = 1`, { routeID });
            if (tripRes.rows && tripRes.rows.length > 0) {
                tripID = tripRes.rows[0].TRIPID || tripRes.rows[0].tripId;
                fare = tripRes.rows[0].BASEFARE || tripRes.rows[0].baseFare || fare;
            } else {
                const vdRes = await executeQuery(conn, `SELECT (SELECT MIN(VehicleID) FROM Vehicles) AS VID, (SELECT MIN(DriverID) FROM Drivers) AS DID FROM DUAL`);
                const vid = vdRes.rows[0].VID || vdRes.rows[0].vid || 1;
                const did = vdRes.rows[0].DID || vdRes.rows[0].did || 1;
                
                const newTripRes = await conn.execute(`
                    INSERT INTO Trips (RouteID, VehicleID, DriverID, DepartureDateTime, ArrivalDateTime, TripStatus, BaseFare)
                    VALUES (:routeID, :vid, :did, SYSDATE + 1, SYSDATE + 2, 'Scheduled', 15)
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
           p.FirstName, p.LastName, t.DepartureDateTime, r.StartLocation, r.EndLocation
    FROM Tickets tk
    JOIN Passengers p ON tk.PassengerID = p.PassengerID
    JOIN Trips t ON tk.TripID = t.TripID
    JOIN Routes r ON t.RouteID = r.RouteID
    ORDER BY tk.TicketID DESC
`, 'Failed to fetch tickets');

const updateTicketStatus = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { ticketID } = req.params;
        const { newStatus } = req.body;
        
        // PL/SQL Block executing business logic to update status
        await conn.execute(`
            BEGIN
                UPDATE Tickets 
                SET TicketStatus = :newStatus 
                WHERE TicketID = :ticketID;
                COMMIT;
            END;
        `, { newStatus, ticketID }, { autoCommit: false });
        
        res.json({ message: 'Ticket status updated via PL/SQL block' });
    }, 'Failed to update ticket status');
};

// --- Reports ---
const getRevenue = async (req, res) => {
    await withConnection(req, res, async (conn) => {
        const { startDate, endDate } = req.query;
        const result = await conn.execute(`
            BEGIN
                :ret := CalculateTotalRevenue(TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'));
            END;
        `, {
            startDate, endDate,
            ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });
        res.json({ totalRevenue: result.outBinds.ret });
    }, 'Failed to calculate revenue');
};

const getFrequentRoutes = fetchAll(`
    SELECT r.RouteID AS ROUTEID, (r.StartLocation || ' to ' || r.EndLocation) AS ROUTENAME, 
           COUNT(DISTINCT t.TripID) AS TRIPCOUNT, r.DistanceKm AS DISTANCEKM, r.EstimatedDuration AS ESTIMATEDDURATION
    FROM Routes r
    LEFT JOIN Trips t ON r.RouteID = t.RouteID
    GROUP BY r.RouteID, r.StartLocation, r.EndLocation, r.DistanceKm, r.EstimatedDuration
    ORDER BY TRIPCOUNT DESC, r.RouteID ASC
`, 'Failed to fetch frequent routes');

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
const getVehicles = fetchAll(`SELECT * FROM Vehicles ORDER BY VehicleID DESC`, 'Failed to fetch vehicles');

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
const deleteTrip = deleteRecord('Trips', 'TripID', 'Failed to delete trip');

const checkTripConflict = async (conn, driverID, vehicleID, start, end, excludeId = null) => {
    const q = `
        SELECT TripID FROM Trips 
        WHERE (DriverID = :driverID OR VehicleID = :vehicleID)
        ${excludeId ? 'AND TripID != :excludeId' : ''}
        AND TripStatus NOT IN ('Completed', 'Cancelled')
        AND (
            (TO_TIMESTAMP(:startDt, 'YYYY-MM-DD"T"HH24:MI') BETWEEN DepartureDateTime AND ArrivalDateTime) OR
            (TO_TIMESTAMP(:endDt, 'YYYY-MM-DD"T"HH24:MI') BETWEEN DepartureDateTime AND ArrivalDateTime) OR
            (DepartureDateTime BETWEEN TO_TIMESTAMP(:startDt, 'YYYY-MM-DD"T"HH24:MI') AND TO_TIMESTAMP(:endDt, 'YYYY-MM-DD"T"HH24:MI'))
        )
    `;
    const params = { driverID, vehicleID, startDt: start, endDt: end };
    if (excludeId) params.excludeId = excludeId;
    
    const conflicts = await executeQuery(conn, q, params);
    if (conflicts.rows.length > 0) {
        const err = new Error();
        err.status = 409;
        err.customMessage = 'Scheduling conflict: Driver or Vehicle is already booked during this time.';
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

        await checkTripConflict(conn, driverID, vehicleID, departureDateTime, arrivalDateTime, id);

        await executeQuery(conn, `
            UPDATE Trips SET RouteID = :routeID, VehicleID = :vehicleID, DriverID = :driverID, 
            DepartureDateTime = TO_TIMESTAMP(:departureDateTime, 'YYYY-MM-DD"T"HH24:MI'), 
            ArrivalDateTime = TO_TIMESTAMP(:arrivalDateTime, 'YYYY-MM-DD"T"HH24:MI'), 
            TripStatus = :tripStatus, BaseFare = :fare WHERE TripID = :id
        `, { routeID, vehicleID, driverID, departureDateTime, arrivalDateTime, tripStatus, fare, id }, true);
        
        res.json({ message: 'Trip updated successfully' });
    }, 'Failed to update trip');
};

module.exports = {
    getRoutes, createRoute, updateRoute, deleteRoute,
    bookTicket, getTickets, updateTicketStatus,
    getRevenue, getFrequentRoutes,
    getPayments, createPayment, updatePayment, deletePayment,
    getDrivers, createDriver, updateDriver, deleteDriver,
    getPassengers, createPassenger, updatePassenger, deletePassenger,
    getVehicles, getTrips, createTrip, updateTrip, deleteTrip
};
