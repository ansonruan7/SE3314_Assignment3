const Helpers = require("./Helpers")
const Singleton = require("./Singleton")

module.exports = {
    createPacket: function (messageType, imageName){

        // create packet information
        const VERSION = 9,
              MESSAGE_TYPE = messageType, // message type is one or two, one for welcome - two for hello
              DHT = Object.entries(Singleton.getPeers()); // Get an array of the current peers
              PEER_NAME = Singleton.getPeerName()
              IMG_NAME_EXT = imageName.split('.');

        let senderInfoData = new Buffer.alloc(4), // 4 bytes for the header information that is not dynamic
            // V = 7 (4 bits), Message Type (1 Byte), Number of Bytes (1 byte), Sender Name Length (1.5 bytes)
            //senderNameData = new Buffer.alloc(PEER_NAME.length), // next is the length of the peername
            peerData = new Buffer.alloc(8*(DHT.length)), // each peer has 6 bytes of data

        /*----------------------- Image Data ------------------------ */
            imageData = new Buffer.alloc(4),
            imageNameData = new Buffer.alloc(IMG_NAME_EXT[0].length);
        
        Helpers.storeBitPacket(imageData, IMG_NAME_EXT[1].toUpperCase(), 0, 4)

        let imageNameInBytes = Helpers.stringToBytes(IMG_NAME_EXT[0]);
        // add the peer name bytes to the buffer
        for (let i=0; i<IMG_NAME_EXT[0].length; i++){
            Helpers.storeBitPacket(imageNameData, imageNameInBytes[i], (i*8), 8) // Store the peer name
        }
        /*--------------------------- END --------------------------- */

        Helpers.storeBitPacket(senderInfoData, VERSION, 0, 4); // store the version
        Helpers.storeBitPacket(senderInfoData, MESSAGE_TYPE, 4, 7) // store message type
        Helpers.storeBitPacket(senderInfoData, DHT.length, 11, 9) // store the number of peers
        Helpers.storeBitPacket(senderInfoData, PEER_NAME.length, 20, 12) // store the length of the peer name

        // let senderNameInBytes = Helpers.stringToBytes(PEER_NAME) // convert the peerName into bytes

        // // add the peer name bytes to the buffer
        // for (let i=0; i<PEER_NAME.length; i++){
        //     Helpers.storeBitPacket(senderNameData, senderNameInBytes[i], (i*8), 8) // Store the peer name
        // }

        let baseAddress = 0; // base address

        // the values of DHT are a hashmap with the address, port, and nodeID
        for (const [_, v] of DHT) {
            let address = v.address,
                port = v.port;
            let [p1, p2, p3, p4] = address.split(".") // split the address based on "."
            Helpers.storeBitPacket(peerData, parseInt(p1), baseAddress+0, 8); // add first part of IP address
            Helpers.storeBitPacket(peerData, parseInt(p2), baseAddress+8, 8); // add second part of IP address
            Helpers.storeBitPacket(peerData, parseInt(p3), baseAddress+16, 8); // add third part of IP address
            Helpers.storeBitPacket(peerData, parseInt(p4), baseAddress+24, 8); // add fourth part of IP address
            Helpers.storeBitPacket(peerData, parseInt(port), baseAddress+32, 16);
            baseAddress += 48+16 // Each node uses 48 bits (32 + 16), want to adjust base each time
        }

        // return a buffer which combines the three segments of buffers
        return Buffer.concat([senderInfoData, peerData, imageData, imageNameData]);},

    parseMessage: function (data) {
        // Get first 4 bytes
        let version = Helpers.parseBitPacket(data, 0, 4) // get the version number
        let messageType = Helpers.parseBitPacket(data, 4, 7) // get the message type
        let numberOfPeers = Helpers.parseBitPacket(data, 11, 9) // get the number of peers
        let senderNameLength = Helpers.parseBitPacket(data, 20, 12) // get the sender name length

        /*----------------------- Image Data ------------------------ */
        let imageDataStart = numberOfPeers*(48+16);
        let imageExtension = Helpers.parseBitPacket(data, 32+imageDataStart, 4);
        let imageNameLength = Helpers.parseBitPacket(data, 32+imageDataStart+4, 28);
        /*--------------------------- END --------------------------- */
       
        // if version number is not 9, ignore the message
        if (version !== 9){
            return;
        }

         // get DHT table information
         let senderDHT = []
         let baseAddress = 32  // get the base addrss for the peeres
         for (let i=0; i<numberOfPeers; i++){
             let p1 = Helpers.parseBitPacket(data, baseAddress, 8), // get IPV4 val 1
                 p2 = Helpers.parseBitPacket(data, baseAddress+8, 8), // get IPV4 val 2
                 p3 = Helpers.parseBitPacket(data, baseAddress+16, 8), // get IPV4 val 3
                 p4 = Helpers.parseBitPacket(data, baseAddress+24, 8); // get IPV4 val 4
             let address = `${p1}.${p2}.${p3}.${p4}`
             let port = Helpers.parseBitPacket(data, baseAddress+32, 16) // get port
             senderDHT.push({
                 address: address,
                 port: port,
                 nodeID: Helpers.getPeerID(address, port),
             })
             baseAddress += 48+16
         }
        
        /*----------------------- Image Data ------------------------ */

        let imageNameArr = [];

        for(let i=0; i<senderNameLength; i++){
            // add bytes of sendName starting @ bit 32 + after peer data 
            imageNameArr.push(Helpers.parseBitPacket(data, 32+imageDataStart+(8*i), 8));
        }

        let imageName = Helpers.bytesToString(imageNameArr);

        /*--------------------------- END --------------------------- */
        
        // get sender name
        // let senderNameArr = []
        // for(let i=0; i<senderNameLength; i++){
        //     // add bytes of sendName starting @ bit 32 + after peer data 
        //     senderNameArr.push(Helpers.parseBitPacket(data, 32+nameDataStart+(8*i), 8)) 
        // }
        // // get the sender name as a string
        // let senderName = Helpers.bytesToString(senderNameArr)
    
       

        // return data as a hashmap
        return {
            version: version,
            messageType: messageType, 
            numberOfPeers: numberOfPeers,
            imageExtension: imageExtension,
            imageNameLength: imageNameLength,
            imageName: imageName,
            senderDHT: senderDHT
        }
    }
}