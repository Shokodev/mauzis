import logger from "./logger.js";

export const worker = (queue, callback) => {
    setInterval(async()=>{
      try {
          let mes = queue.peek(); 
          if(mes){
            if(mes !== 'ignore'){
                 await callback(mes);
            }
            queue.dequeue();
          };
      } catch (err){
          logger.error(`Queue worker error: ${err}`)
      }  
    },500);
    logger.info("Message worker started!");    
}