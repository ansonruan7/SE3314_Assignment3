let net = require("net") // load net for server

const KADP2PPackets = require('./KADP2PPackets')
const Helpers = require("./Helpers")
const Singleton = require("./Singleton")

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

    }
}