import logger from "./logger.js";
import { Telegraf } from "telegraf";
import { config } from "dotenv";
import petcare from "./sure-petcare.js";
import app from "./webservice.js";
import { checkTrackers } from "./tractive.js";

config();
const bot = new Telegraf(process.env.BOT_ID);
const pets = Array.from(process.env.PETS.split(","));

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
  //await bot.telegram.sendMessage(process.env.CHAT_ID, err);
});

petcare.on("message", async (mes) => {
  if (mes !== "ignore") {
    try {
      await bot.telegram.sendMessage(process.env.CHAT_ID, mes);
    } catch (err) {
      logger.error(`Send message failed: ${err.message}`);
    }
  }
});

petcare.on("started", (start) => {
  app.get("/pc", async (req, res) => {
    res.json(petcare);
  });

  app.post("/setdoor", async (req, res) => {
    let device = petcare.household.petCareData.devices.find(
      (device) => device.name === process.env.DOORNAME
    );
    let state;
    if (req.body.state === "lock") {
      state = 1;
    }
    if (req.body.state === "unlock") {
      state = 0;
    }
    let result = await petcare.setDoorState(process.env.DOORNAME, state);
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
    if (state === 0) {
      res.json({ state:"unlocked" });
    } else {
      res.json({ state:"locked" });
    }
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
