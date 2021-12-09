import logger from "./logger.js";

export const worker = (queue, callback) => {
    setInterval(async()=>{
      let mes;  
      try {
          mes = queue.peek(); 
          if(mes){
            if(mes !== 'ignore'){
                 await callback(mes);
            }
            queue.dequeue();
          };
      } catch (err){
          logger.error(`Queue worker error: ${err} drop msg: ${mes}`);
          queue.dequeue();
          await new Promise(r=>setInterval(r(),1000));
      }  
    },500);
    logger.info("Message worker started!");    
}