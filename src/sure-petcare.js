import PetCare from 'node-surepetcare';
import { config } from 'dotenv';
import logger from './logger.js';
import { checkTrackers } from "./tractive.js";
import cron from 'node-cron';
config();

const petcareOptions = {
    update_polling_seconds: 20,
    message_throttle_ms: 500,
    battery_full: 1.4,
    battery_low: 1.15,
    login_cycle: '0 11,23 * * *',
    somethingWrongMsg: "öpis isch nid guet😑",
    successMsg: "ok 😊",
    doorOpenText: "offe",
    doorlockedInText:"zue vo inne",
    doorlockedOutText:"zue vo usse",
    doorlockedAllText:"ganz zue",
    petInsideText: "dinne",
    petOutsideText: "dusse",
    tareLeftText: "links",
    tareRightText: "rechts",
    tareBothText: "uf beidne site",
    doorIsAlready: (doorName, state) => `${doorName} isch dänk scho ${state}😝`,
    petIsAlready: (petName, state) => `${petName} is isch dänk ${state}🙄`,
    petMovementText: (petName, bit) => bit === 1 ? 
        `${petName} isch jetz dinne, Hello ${petName} 😍` :
        bit === 2 ? `${petName} isch use, stay safe ❤️` : 
        `${petName} het dürs törli gluegt 👀`,
    unknownMovementText: (bit) => 
        bit === 2 ? "Het äuä öper d Hang durs törli gha..." : 
        "Es angers chätzli het id stube gluegt 😺",
    petHasEatenText: (petName, left, right) => `${petName} hat gässe:\n ${left}g droche & ${right}g nass`,
    filledBowlText: (bowlName, left, right) => `${bowlName} gfüllt mit:\n ${left}g droche & ${right}g nass`, 
    resetFeederText: (bowlName, tareVal) => `${bowlName} isch ${tareVal} zrüggsetzt worde`,
    batteryLowText: () => `ignore`,
    petDrankText: (petName,val) => `${petName} het ${val}ml drunke💧`,
    felaquaFillText:(deviceName,val) => `${deviceName} mit ${val}ml befüllt`,
    felaquaReminderText: (deviceName) => `${deviceName} set neus wasser ha`,
    felaquaUnknownDrinkerText: (deviceName, val) => `Igrendöpper het ${val}ml drunke us ${deviceName}`,
    petWhereaboutText:(petName,where) => `${petName} isch ${where} ${where === "dinne" ? '😊': '🧐'}`
}

const petcare = function setup() {
    try {
        const petcare = new PetCare({
              mail:process.env.MAIL,
              password:process.env.PASSWORD
        },petcareOptions);
        return petcare;    
      } catch(err){
        logger.error(err);
        process.exit(0);
      }
}();

petcare.getPetCustomReport = ()=> {
    try {
        let msg = "";
        petcare.household.petCareData.devices.forEach(device => {
            if (device.product_id === petcare.utils.products.DOOR || device.product_id === petcare.utils.products.DOOR_SMALL) {
                msg = `${device.name} isch ${petcare.utils.doorStates[device.status.locking.mode]}\n`;
            }
        });
        msg = `${msg}***************************\n`;
        petcare.household.petCareData.pets.forEach(pet => {
            let where = petcare.utils.placeNames[pet.status.activity.where];
            msg = `${msg}${petcare.utils.petWhereaboutText(pet.name,where)}\n`;
            if (petcare.household.pets[pet.name]) {
                msg = `${msg}Nass:\n` +
                    `${petcare.household.pets[pet.name].eatenRight}g vo ${petcare.household.pets[pet.name].lastFillRight}g gässe, ${petcare.household.pets[pet.name].currentRight}g übrig \n` +
                    `Gsamt ${petcare.household.pets[pet.name].eatenRightSoFar}g vo ${petcare.household.pets[pet.name].fillRightToday}g gässe\n` +
                    `Troche:\n` +
                    `${petcare.household.pets[pet.name].eatenLeft}g vo ${petcare.household.pets[pet.name].lastFillLeft}g gässe, ${petcare.household.pets[pet.name].currentLeft}g übrig \n` +
                    `Gsamt ${petcare.household.pets[pet.name].eatenLeftSoFar}g vo ${petcare.household.pets[pet.name].fillLeftToday}g gässe\n` +
                    `Und het bis iz ${petcare.household.pets[pet.name].drank}ml drunke\n` + 
                    `***************************\n`
            }
        });
        if(petcare.household.felaqua_level >= 0){
            msg = `${msg}Felaqua stand: ${petcare.household.felaqua_level}ml`
        }
        petcare.emit('message', msg);
    } catch (err) {
        logger.error(`Pet report error: ${err}`);
        petcare.emit('err',`Pet report error: ${err}`);
    }
};

//Automatic door closing
cron.schedule(process.env.CRON_DOOR_CLOSING_JOB || '0 19 * * *', () => {
    petcare.emit('info',`Start cron job for door closing`);
    petcare.emit('message',`Türli zu mache...`);
    let door = petcare.household.petCareData.devices
    .find(d=>d.product_id === petcare.utils.products.DOOR);
    petcare.setDoorState(door.name, petcare.utils.doorCommands.LOCK_IN);
});


//Battery Check (if you have rechargeable bats (1.2 instead of 1.6v)

cron.schedule(process.env.CRON_BATTERY_CHECK || '0 08 * * *', () => {
    petcare.emit('info',`Start battery check`);
    petcare.household.petCareData.devices.forEach(device => {
        if (device.status.battery) {
            let voltage = device.status.battery / 4; //cos 4 batteries
            let percent = Math.round(((voltage - petcare.utils.batteryLow) / (petcare.utils.batteryFull - petcare.utils.batteryLow)) * 100);
            let lim = process.env.BATTERY_LIMIT || 16
            if(percent < lim) petcare.emit('message',`${device.name} het fasch ke saft me 🙀 ${percent}% (${voltage}) `);
        }
    });
});

//Additional check for tractive trackers
cron.schedule(process.env.CRON_TRACKER_CHECK || '0 19 * * *', async () => {
    petcare.emit('info',`Start tracker check`);
    const data = await checkTrackers();
    let map = {
        TLCEWOPY: pets[0],
        TWCAHAFR: pets[1],
        TKJHLTXY: pets[2],
    };
    data.forEach(tracker=>{
        let level = parseInt(tracker.battery.replace('%',''));
        if(level < process.env.TRACKER_LIMIT || 16){
           this.emit('message',`${map[tracker.tracker]}'s tracker isch fascht läär: ${tracker.battery} 🙀`); 
        }
    });
});


export default petcare;

