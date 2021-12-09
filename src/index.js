import logger from './logger.js';
import axios from 'axios';
import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import petcare from './sure-petcare.js';
import { Queue } from './Queue.js';
import { worker } from './message-worker.js';
config();
const bot = new Telegraf(process.env.BOT_ID);
const pets = Array.from(process.env.PETS.split(","));
const messageQueue = new Queue();

worker(messageQueue,async (mes) => {
    await bot.telegram.sendMessage(process.env.CHAT_ID,mes);
});

bot.use(async (ctx, next) => {
    //basic security
    if (Array.from(process.env.USERIDS.split(",")).includes(ctx.update.message.from.id.toString())) {
        await next()
    } else {
        ctx.reply("You are not authorized!")
    }
});

petcare.on("info", (info) => {
    logger.info(info);
});

petcare.on("error", (err) => {
    logger.error(err);
    bot.telegram.sendMessage(process.env.CHAT_ID, err).catch(err=>error(`Error listener: ${err}`));
});

petcare.on("message", async (mes) => {
    messageQueue.enqueue(mes);
});

petcare.on("direct_message", (msg) => {
    
});

bot.launch();
bot.catch(err=> logger.error(`Bot main: ${err}`));

bot.command('1', () =>  petcare.setDoorState(process.env.DOORNAME, petcare.utils.doorCommands.OPEN));
bot.command('2', () =>  petcare.setDoorState(process.env.DOORNAME, petcare.utils.doorCommands.LOCK_IN));
bot.command('3', () =>  petcare.setDoorState(process.env.DOORNAME, petcare.utils.doorCommands.LOCK_OUT));
bot.command('4', () =>  petcare.setDoorState(process.env.DOORNAME, petcare.utils.doorCommands.LOCK_ALL));
bot.command('5', () =>  petcare.resetFeeders(petcare.utils.feederResetCommands.LEFT));
bot.command('6', () =>  petcare.resetFeeders(petcare.utils.feederResetCommands.RIGHT));
bot.command('7', () =>  petcare.resetFeeders(petcare.utils.feederResetCommands.BOTH));
bot.command('8', () =>  petcare.getPetCustomReport());
bot.command('9', async (ctx) =>  {
    petcare.getDeviceReport();
    try {
    const { data } = await axios.get('http://tractive:3000/report');  
        let map = {
            "TLCEWOPY": pets[0],
            "TWCAHAFR": pets[1],
            "TKJHLTXY": pets[2],
        }
        ctx.reply(data.reduce((acc, val) => {
                return `${acc}${map[val.tracker]}: ${val.battery}\n`
            }, "Trackers\n***************************\n"));
    } catch(err) {
        logger.error(`Tractive fetch failed: ${err}`)
    };
});
bot.command('10', () => petcare.setPetPlace(pets[0], petcare.utils.petPlaceCommands.INSIDE));
bot.command('11', () => petcare.setPetPlace(pets[0], petcare.utils.petPlaceCommands.OUTSIDE));
bot.command('12', () => petcare.setPetPlace(pets[1], petcare.utils.petPlaceCommands.INSIDE));
bot.command('13', () => petcare.setPetPlace(pets[1], petcare.utils.petPlaceCommands.OUTSIDE));
bot.command('14', () => petcare.setPetPlace(pets[2], petcare.utils.petPlaceCommands.INSIDE));
bot.command('15', () => petcare.setPetPlace(pets[2], petcare.utils.petPlaceCommands.OUTSIDE));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));