async function test() {
    const res = await fetch('http://localhost:3000/api/passengers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'User', lastName: 'Test', phone: '123456789', email: 'test@test.com' })
    });
    const text = await res.text();
    console.log(res.status, text);
}
test();
