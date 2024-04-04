const Helpers = require("./Helpers")
const Singleton = require("./Singleton")

module.exports = {
    createPacket: function (messageType, imageName, HOST, PORT){
        // create packet information
        const VERSION = 9,
              MESSAGE_TYPE = messageType, // message type is one or two, one for welcome - two for hello
              DHT = Object.entries(Singleton.getPeers()); // Get an array of the current peers
              PEER_NAME = Singleton.getPeerName()
              IMG_NAME_EXT = imageName.split('.');

        let senderInfoData = new Buffer.alloc(4), // 4 bytes for the header information that is not dynamic
            // V = 7 (4 bits), Message Type (1 Byte), Number of Bytes (1 byte), Sender Name Length (1.5 bytes)
            //senderNameData = new Buffer.alloc(PEER_NAME.length), // next is the length of the peername
            originData = new Buffer.alloc(8), // 8 bytes for originData

        /*----------------------- Image Data ------------------------ */
            imageData = new Buffer.alloc(4),
            imageNameData = new Buffer.alloc(IMG_NAME_EXT[0].length),
            imageNameLength = IMG_NAME_EXT[0].length,
            imageExt;
        
        //Transform image extension into the proper type
        switch(IMG_NAME_EXT[1].toUpperCase()){
            case("BMP"):
                imageExt = 1;
                break;
            case("JPEG"):
                imageExt = 2;
                break;
            case("GIF"):
                imageExt = 3;
                break;
            case("PNG"):
                imageExt = 4;
                break;
            case("TIFF"):
                imageExt = 5;
                break;
            case("RAW"):
                imageExt = 15;
                break;
        }
        Helpers.storeBitPacket(imageData, imageExt, 0, 4);
        Helpers.storeBitPacket(imageData, imageNameLength, 4, 28);

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

        /*------------------------------- Store originating peer info ----------------------------- */
        let [p1, p2, p3, p4] = HOST.split(".") // split the address based on "."
            Helpers.storeBitPacket(originData, parseInt(p1), 0, 8); // add first part of IP address
            Helpers.storeBitPacket(originData, parseInt(p2), 8, 8); // add second part of IP address
            Helpers.storeBitPacket(originData, parseInt(p3), 16, 8); // add third part of IP address
            Helpers.storeBitPacket(originData, parseInt(p4), 24, 8); // add fourth part of IP address
        Helpers.storeBitPacket(originData, parseInt(PORT), 32, 16);
        /*--------------------------- END --------------------------- */
        

        // return a buffer which combines the three segments of buffers
        return Buffer.concat([senderInfoData, originData, imageData, imageNameData]);},

    parseMessage: function (data) {
        // Get first 4 bytes
        let version = Helpers.parseBitPacket(data, 0, 4) // get the version number
        let messageType = Helpers.parseBitPacket(data, 4, 7) // get the message type
        let numberOfPeers = Helpers.parseBitPacket(data, 11, 9) // get the number of peers
        let senderNameLength = Helpers.parseBitPacket(data, 20, 12) // get the sender name length

        /*----------------------- Image Data ------------------------ */
        let imageDataStart = 32 + 64;
        let imageExtensionData = Helpers.parseBitPacket(data, imageDataStart, 4);
        //Transform image extension into the proper type
        let imageExt;
        switch(imageExtensionData){
            case(1):
                imageExt = "BMP";
                break;
            case(2):
                imageExt = "JPEG";
                break;
            case(3):
                imageExt = "GIF";
                break;
            case(4):
                imageExt = "PNG";
                break;
            case(5):
                imageExt = "TIFF";
                break;
            case(15):
                imageExt = "RAW";
                break;
        }
        let imageNameLength = Helpers.parseBitPacket(data, imageDataStart+4, 28);
        /*--------------------------- END --------------------------- */
       
        // if version number is not 9, ignore the message
        if (version !== 9){
            return;
        }

        /*----------------------- Origin Data ----------------------- */
        let p1 = Helpers.parseBitPacket(data, 32, 8), // get IPV4 val 1
                 p2 = Helpers.parseBitPacket(data, 32+8, 8), // get IPV4 val 2
                 p3 = Helpers.parseBitPacket(data, 32+16, 8), // get IPV4 val 3
                 p4 = Helpers.parseBitPacket(data, 32+24, 8); // get IPV4 val 4
             let address = `${p1}.${p2}.${p3}.${p4}`
             let port = Helpers.parseBitPacket(data, 32+32, 16) // get port
        /*--------------------------- END --------------------------- */
        
        /*----------------------- Image Data ------------------------ */

        let imageNameArr = [];
        for(let i=0; i<imageNameLength; i++){
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
            originHost: address,
            originPort: port, 
            imageExtension: imageExt,
            imageNameLength: imageNameLength,
            imageName: imageName,
        }
    }
}