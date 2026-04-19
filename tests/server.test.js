const request = require('supertest');
const app = require('../server'); 

describe('A.E.R.A API Integrity & Security Checks', () => {

    describe('GET /api/config', () => {
        it('should confidently respond with 200 via Secure Header Middleware', async () => {
            const res = await request(app).get('/api/config');
            expect(res.statusCode).toEqual(200);
            expect(res.headers).toHaveProperty('x-xss-protection'); // Helmet Proof
            expect(res.body).toHaveProperty('MAPS_KEY');
        });
    });

    describe('POST /api/chat', () => {
        it('should correctly reject malformed NLP strings with HTTP 400', async () => {
            const res = await request(app)
                .post('/api/chat')
                .send({ message: null }); // explicitly invalid input

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should successfully sanitize and process standard textual input natively', async () => {
            const res = await request(app)
                .post('/api/chat')
                .send({ 
                    message: "Where is the nearest shelter?",
                    context: { disasterType: 'none', severity: 0 },
                    location: { lat: 0, lng: 0 }
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('riskLevel');
            expect(res.body).toHaveProperty('action');
            expect(res.body).toHaveProperty('reasoning');
            expect(res.body).toHaveProperty('timestamp');
        });
    });

});
