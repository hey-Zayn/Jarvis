export function createHttpApp({ serviceName }) {
    return {
        register(app) {
            app.get('/', (req, res) => {
                res.json({ message: `${serviceName} is running` });
            });

            app.get('/health', (req, res) => {
                res.json({ status: 'ok', service: serviceName });
            });
        }
    };
}