let net = require("net") // load net for server

const KADP2PPackets = require('./KADP2PPackets')
const KADRequestPackets = require('./KADRequestPackets')
const Helpers = require("./Helpers")
const Singleton = require("./Singleton")

//ASSIGNMENT 1 IMPORTS
const fs = require("fs");
var ITPpacket = require("./ITPResponse");

module.exports = {

    handleClientJoining: function (socket) {

        // print connection method
        console.log(`\nConnected from peer ${socket.remoteAddress}:${socket.remotePort}`)

        // send over welcome message
        socket.write(KADP2PPackets.createPacket(1));

        // push the information to this bucket
        this.pushBucket(Singleton.getPeers(), {
            address: socket.remoteAddress,
            port: socket.remotePort
        })

        //Print DHT
        console.log(`\nMy DHT:`)
        Helpers.printDHT(Object.values(Singleton.getPeers())) // print out the DHT
    },

    handleIncomingData: function(data, PORT, HOST){
        try {
          let packetInfo = KADP2PPackets.parseMessage(data) // parse info

          // print hello message based on packetInfo type
          if (packetInfo.messageType === 1){
              console.log(`\nReceived Welcome Message from ${packetInfo.senderName} ${Helpers.getPeerID(HOST, PORT)} along with DHT`)
          } else if (packetInfo.messageType === 2){
              console.log(`\nReceived Hello Message from ${packetInfo.senderName} ${Helpers.getPeerID(HOST, PORT)} along with DHT`)
          }

          Helpers.printReceivedDHT(packetInfo.senderDHT) // print the DHT

          // add the send of the welcome message to be refreshed
          packetInfo.senderDHT.push({
              address: HOST,
              port: PORT,
              name: packetInfo.senderName,
              nodeID: Helpers.getPeerID(HOST, PORT),
          })

          // Send over the current DHT, and the info of the peers
          this.refreshBucket(Singleton.getPeers(), packetInfo.senderDHT)

        /*------------------------------- If it's a search packet -------------------------------- */
        } catch (error) {
          let packetInfo = KADRequestPackets.parseMessage(data);
          if (packetInfo.messageType === 4){
            console.log(`\nReceived KADP2P search request from ${Helpers.getPeerID(HOST, PORT)} originally from ${PORT}`)
          }
          return packetInfo;
        }
        /*------------------------------- END -------------------------------- */
    },

    sendHello: function (T) {

        console.log('\nHello packet has been sent.')

        let packetToSend = KADP2PPackets.createPacket(2) // get hello packet

        function makeHellos(keys){
            if(keys.length <= 0){
                return // stop the recursion when there are no more keys to send
            }
            let n = keys.pop()
            // get peer info
            let address = T[n].address,
                port = T[n].port;

            // open socket with other peers
            let HelloConn = net.createConnection({
                host: address,
                port: port,
                localPort: Singleton.getPort() // get the port that was used to create the intiial connection
            }, () => {
                HelloConn.write(packetToSend) // send hello packet
                HelloConn.destroy() // "Close the connection immediately so that the port can be used"
            })
            HelloConn.on("close", () => {
                makeHellos(keys)
            })
        }
        let keys = Object.keys(T)
        makeHellos(keys) // recursively loop through DHT table provided, and keep going until all messages are sent

    },

    refreshBucket: function(T, P){
        // for each peer, push bucket
        P.forEach((peerInfo) => {
            /*
            refresh bucket is passed a list of peers with the format
            {
                address: X
                port: X
            }
            */
            this.pushBucket(T, peerInfo)
        })
        console.log('\nRefresh k-Bucket operation is performed')
        console.log(`\nMy DHT:`)
        Helpers.printDHT(Object.values(T)) // print out the DHT
    },

    pushBucket: function(T, P){

        /*
        Examine the bits value of both P and the peer owning T, say P′, to determine the maximum
        number of the leftmost bits shared between P and P′, say n. 
        */
        
        // Get node ID - return hex
        let nodeID = Singleton.getPeerID()

        // Get peer ID - return hex
        let address = P.address,
            port = P.port;
        let peerID = Helpers.getPeerID(address, port)

        // Skip the pushBucket operation since the new node is itself.
        if(nodeID === peerID){
            return
        }

        // XOR peer IDS
        let xorString = Helpers.XORing(Helpers.Hex2Bin(nodeID), Helpers.Hex2Bin(peerID));

        // Find count of matches
        let n = Helpers.getXORMatchingLength(xorString);

        if (!(n.toString() in T)){

            console.log(`\nBucket P${n} has no value, adding ${peerID}`)

            /*
            If the nth k-bucket in T is empty insert P into the nth k-bucket.  
            */
            T[n] = {
                prefix: n,
                address: address,
                port: port,
                nodeID: peerID,
            };

            
        }else{
            /*
            If the nth k-bucket is full, say it has the peer N, the do the following:
            - Determine which of the peers P and N is closer to P′. Remember Kademlia uses the exclusive
            OR operator to find the distance between two peers. Please review Unit 2.
            - The closet peer to P′ is added into the nth k-bucket in T. 
            */
            let currentPeerID = Helpers.getPeerID(T[n].address, T[n].port)
            let currentXORString = Helpers.XORing(Helpers.Hex2Bin(nodeID), Helpers.Hex2Bin(currentPeerID));
            console.log(`\nBucket P${T[n].prefix} is full, checking if we need to change the stored value`)
            //console.log('\nPrevious value is replaced by the new one')

            // use parseint to convert binary to decimal
            if(parseInt(currentXORString, 2) > parseInt(xorString, 2)){
                // The current peer listed is further than the incoming one
                // update the table
                console.log(`${peerID} is closer than our current stored value ${currentPeerID}, therefore we will update.`)  
                T[n] = {
                    prefix: n,
                    address: address,
                    port: port,
                    nodeID: peerID,
                };
            }
            else
            {
                console.log(`Current value is closest, no update needed`)
            }
        }

    },
    /*----------------------------- FROM ASSIGNMENT 1 ------------------------------ */
    handleImageJoining: function (sock) {
        assignImageName(sock, nickNames);
        const chunks = [];
        console.log(
          "\n" +
            nickNames[sock.id] +
            " is connected at timestamp: " +
            startTimestamp[sock.id]
        );
        sock.on("data", function (requestPacket) {
          handleImageRequests(requestPacket, sock); //read client requests and respond
        });
        sock.on("close", function () {
          handleImageLeaving(sock);
        });
      },
      
      //-------------------------------- Check if file is in this peer -------------------------------//
      searchPacket: function(imageFullName){
        //Get the image hash
        let imageID = Helpers.getKeyID(imageFullName);
        //Search DHT for closest peer
        let xorString = '0', receivingPeer;
        let peers = Singleton.getPeers();
        //Loop through DHT
        for(let i in peers){
          //Check distance from image key to peer key
          let currentXORString = Helpers.XORing(Helpers.Hex2Bin(imageID), Helpers.Hex2Bin(peers[i].nodeID));
          //Check if it is closer than a previous check
          if(parseInt(currentXORString, 2) > parseInt(xorString, 2)){
            receivingPeer = peers[i];
          }
        }
        console.log(`Sending KADP2P request message to ${receivingPeer.address}:${receivingPeer.port}\n`);
        //Create search packet
        let pkt = KADRequestPackets.createPacket(4, imageFullName);
        //Create a connection to the peer
        let searchConn = net.createConnection({
          host: receivingPeer.address,
          port: receivingPeer.port,
          localPort: Singleton.getPort()
        }, async () => {
          //Send to the peer
          searchConn.write(pkt);
          searchConn.destroy();
        });
      }
      //-------------------------------- END -------------------------------//
}

/*----------------------------- FROM ASSIGNMENT 1 ------------------------------ */
var nickNames = {},
clientIP = {},
startTimestamp = {};

async function handleImageRequests(data, sock) {
    console.log("\nITP packet received:");
    printPacketBit(data);
  
    let version = parseBitPacket(data, 0, 4);
    let requestType = parseBitPacket(data, 30, 2);
    let requestName = {
      0: "Query",
      1: "Found",
      2: "Not found",
      3: "Busy",
    };
    let imageExtension = {
      1: "PNG",
      2: "BMP",
      3: "TIFF",
      4: "JPEG",
      5: "GIF",
      15: "RAW",
    };
    let timeStamp = parseBitPacket(data, 32, 32);
    let imageType = parseBitPacket(data, 64, 4);
    let imageTypeName = imageExtension[imageType];
    let imageNameSize = parseBitPacket(data, 68, 28);
    let imageName = bytesToString(data.slice(12, 13 + imageNameSize));
   
    console.log(
      "\n" +
        nickNames[sock.id] +
        " requests:" +
        "\n    --ITP version: " +
        version +
        "\n    --Timestamp: " +
        timeStamp +
        "\n    --Request type: " +
        requestName[requestType] +
        "\n    --Image file extension(s): " +
        imageTypeName +
        "\n    --Image file name: " +
        imageName +
        "\n"
    );

    let imageData;

    if (version == 9) {  
        let imageFullName = imageName + "." + imageTypeName;

        //-------------------------------- Check if file is in this peer -------------------------------//
        try {
          imageData = fs.readFileSync(imageFullName);  
        } catch (error) { 
          //Go back to KADpeerDB, image isn't here
          return imageFullName;
        }
        //------------------------------------------- END ---------------------------------------------//
  
      ITPpacket.init(
        version,
        1, // response type
        Singleton.getSequenceNumber(), // sequence number
        Singleton.getTimestamp(), // timestamp
        imageData, // image data
      );
  
      sock.write(ITPpacket.getBytePacket());
      sock.end();
    } else {
      console.log("The protocol version is not supported");
      sock.end();
    }
  }
  
function handleImageLeaving(sock) {
    console.log(nickNames[sock.id] + " closed the connection");
}

function assignImageName(sock, nickNames) {
    sock.id = sock.remoteAddress + ":" + sock.remotePort;
    startTimestamp[sock.id] = Singleton.getTimestamp();
    var name = "Image-" + startTimestamp[sock.id];
    nickNames[sock.id] = name;
    clientIP[sock.id] = sock.remoteAddress;
  }
  
function bytesToString(array) {
  var result = "";
  for (var i = 0; i < array.length; ++i) {
    result += String.fromCharCode(array[i]);
  }
  return result;
}

function bytes2number(array) {
  var result = "";
  for (var i = 0; i < array.length; ++i) {
    result ^= array[array.length - i - 1] << (8 * i);
  }
  return result;
}

// return integer value of a subset bits
function parseBitPacket(packet, offset, length) {
  let number = "";
  for (var i = 0; i < length; i++) {
    // let us get the actual byte position of the offset
    let bytePosition = Math.floor((offset + i) / 8);
    let bitPosition = 7 - ((offset + i) % 8);
    let bit = (packet[bytePosition] >> bitPosition) % 2;
    number = (number << 1) | bit;
  }
  return number;
}
// Prints the entire packet in bits format
function printPacketBit(packet) {
  var bitString = "";

  for (var i = 0; i < packet.length; i++) {
    // To add leading zeros
    var b = "00000000" + packet[i].toString(2);
    // To print 4 bytes per line
    if (i > 0 && i % 4 == 0) bitString += "\n";
    bitString += " " + b.substr(b.length - 8);
  }
  console.log(bitString);
}

  