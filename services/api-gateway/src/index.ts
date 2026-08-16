import express from "express";

const app = express();
const port = Number(process.env.API_GATEWAY_PORT ?? 5000);

// This service is deliberately stateless. Database access belongs to domain services.
app.get("/health", (_request, response) => {
  response.status(200).json({ service: "api-gateway", status: "ok" });
});

app.listen(port, () => {
  console.log(`api-gateway listening on port ${port}`);
});
