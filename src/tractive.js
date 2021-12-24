import logger from "./logger.js";
import axios from "axios";

export const checkTrackers = async () => {
    try {
        const { data } = await axios.get("http://tractive:3000/report");
        return data;
      } catch (err) {
        logger.error(`Tractive fetch failed: ${err}`);
        return null;
    }
}