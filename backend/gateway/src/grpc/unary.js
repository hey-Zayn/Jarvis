export function unary(client, methodName, payload) {
    return new Promise((resolve, reject) => {
        client[methodName](payload, (error, response) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(response);
        });
    });
}