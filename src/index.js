import logger from "./logger.js";
import axios from "axios";
import { Telegraf } from "telegraf";
import { config } from "dotenv";
import petcare from "./sure-petcare.js";
import app from "./webservice.js";
import { checkTrackers } from "./tractive.js";

config();
const bot = new Telegraf(process.env.BOT_ID);
const pets = Array.from(process.env.PETS.split(","));

const sendToElastic = async (data) => {
  data.dump_createdAt = new Date();
  try {
    await axios.post(`http://elasticsearch:9200/mauzis-msg-dump/cats`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    logger.error(
      `send message from [${data.dump_createdAt}] to elastic failed with: ${err}`
    );
  }
};

bot.use(async (ctx, next) => {
  //basic security
  if (
    Array.from(process.env.USERIDS.split(",")).includes(
      ctx.update.message.from.id.toString()
    )
  ) {
    await next();
  } else {
    ctx.reply("You are not authorized!");
  }
});

petcare.on("info", (info) => {
  logger.info(info);
});

petcare.on("error", async (err) => {
  logger.error(err);
  await bot.telegram.sendMessage(process.env.CHAT_ID, err);
});

petcare.on("message", async (mes) => {
  sendToElastic({ message: mes });
  if (mes !== "ignore") {
    try {
      await bot.telegram.sendMessage(process.env.CHAT_ID, mes);
    } catch (err) {
      logger.error(`Send message failed: ${err.message}`);
    }
  }
});

petcare.on("direct_message", async (msg) => {
  sendToElastic(msg);
});

petcare.on("started", (start) => {
  app.get("/pc", async (req, res) => {
    res.json(petcare);
  });
  
  app.post("/toggledoor", async (req, res) => {
    let device = petcare.household.petCareData.devices.find(
      (device) => device.name === process.env.DOORNAME
    );
    let newState = device.status.locking.mode == 0 ? 1 : 0;
    let result = await petcare.setDoorState(process.env.DOORNAME, newState);
    if (result.data) {
      res.send(true);
    } else {
      res.send(false);
    }
  });
  
  app.get("/doorstate", async (req, res) => {
    let device = petcare.household.petCareData.devices.find(
      (device) => device.name === process.env.DOORNAME
    );
    let state = device.status.locking.mode;
    res.json({ state });
  });
});

bot.launch();
bot.catch((err) => logger.error(`Bot main: ${err}`));

bot.command("1", () =>
  petcare.setDoorState(process.env.DOORNAME, petcare.utils.doorCommands.OPEN)
);
bot.command("2", () =>
  petcare.setDoorState(process.env.DOORNAME, petcare.utils.doorCommands.LOCK_IN)
);
bot.command("3", () =>
  petcare.setDoorState(
    process.env.DOORNAME,
    petcare.utils.doorCommands.LOCK_OUT
  )
);
bot.command("4", () =>
  petcare.setDoorState(
    process.env.DOORNAME,
    petcare.utils.doorCommands.LOCK_ALL
  )
);
bot.command("5", () =>
  petcare.resetFeeders(petcare.utils.feederResetCommands.LEFT)
);
bot.command("6", () =>
  petcare.resetFeeders(petcare.utils.feederResetCommands.RIGHT)
);
bot.command("7", () =>
  petcare.resetFeeders(petcare.utils.feederResetCommands.BOTH)
);
bot.command("8", () => petcare.getPetCustomReport());
bot.command("9", async (ctx) => {
  petcare.getDeviceReport();
  let map = {
    TLCEWOPY: pets[0],
    TWCAHAFR: pets[1],
    TKJHLTXY: pets[2],
  };
  const data = await checkTrackers();
  ctx.reply(
    data
      ? data.reduce((acc, val) => {
          return `${acc}${map[val.tracker]}: ${val.battery}\n`;
        }, "Trackers\n***************************\n")
      : "No data for Trackers😿"
  );
});
bot.command("10", () =>
  petcare.setPetPlace(pets[0], petcare.utils.petPlaceCommands.INSIDE)
);
bot.command("11", () =>
  petcare.setPetPlace(pets[0], petcare.utils.petPlaceCommands.OUTSIDE)
);
bot.command("12", () =>
  petcare.setPetPlace(pets[1], petcare.utils.petPlaceCommands.INSIDE)
);
bot.command("13", () =>
  petcare.setPetPlace(pets[1], petcare.utils.petPlaceCommands.OUTSIDE)
);
bot.command("14", () =>
  petcare.setPetPlace(pets[2], petcare.utils.petPlaceCommands.INSIDE)
);
bot.command("15", () =>
  petcare.setPetPlace(pets[2], petcare.utils.petPlaceCommands.OUTSIDE)
);

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
