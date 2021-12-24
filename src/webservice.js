import express from "express";
import logger from "./logger.js";
const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;
app.listen(port, () => {
  logger.info(`service is running on:: [${port}]`);
});
export default app;

