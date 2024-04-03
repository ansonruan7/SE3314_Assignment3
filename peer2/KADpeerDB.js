let net = require("net") // load net for server
let Helpers = require('./Helpers')
let Singleton = require('./Singleton')
let KADP2PPackets = require('./KADP2PPackets')
let P2PHandler = require('./P2PHandler')
let ITPpacket = require('./ITPResponse')

// net settings used from assignment 1
net.bytesWritten = 300000;
net.bufferSize = 300000;

// Set up HOST, PORT, and Singleton 
let HOST = '127.0.0.1',
    PORT;
let arguments = process.argv // get current arguments

Singleton.init(); // initialize singleton
let peerName = arguments[3]
    Singleton.setPeerName(peerName)

/*-------------------- Scan for images and set up key and name ------------------------*/
const fs = require('fs');
const path = require('path');
//Check current directory
fs.readdir(`../${peerName}`, (err, files) => {
    if (err) {
        console.log('Error reading directory:', err);
        return;
    }
    //Check all files from this directory
    files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        //If it's an image
        if(ext === '.gif' || ext === '.jpeg' || ext === '.png' || ext === '.bmp'){
            //Add an image to the images in singleton
            Singleton.setImage(Helpers.getKeyID(file), file);
        }
    });
});
/*-------------------- END ------------------------*/

if (arguments.length <= 4){
    // in this case it is peer1, set up as server right away
    let peerName = arguments[3]
    Singleton.setPeerName(peerName) // set the peer name in the singleton
    // Set up peer
    
    /*-------------------- Check name for port assigning ------------------------*/
    switch(peerName){
        case "peer1":
            PORT = 2011;
            break;
        case "peer2":
            PORT = 2013;
            break;
        case "peer3":
            PORT = 2087;
            break;
        case "peer4":
            PORT = 2045;
            break;
    }
    /*-------------------- END ------------------------*/
    
    const peer = net.createServer(); // create server
    peer.listen(PORT, HOST);

    /*-------------------- Create a second server to host image requests ------------------------*/
    const image = net.createServer();
    const PORT_db = Helpers.getRandomPort(); // get a random port to start up server
    image.listen(PORT_db, HOST);

    //Image function
    image.on('connection', function(sock) {
        P2PHandler.handleImageJoining(sock); //called for each client joining
    });

    console.log(`ImageDB server has started at timestamp: ${Singleton.getTimestamp()} and is listening on ${HOST}:${PORT_db}`);
    /*-------------------- END ------------------------*/

    let peerID = Helpers.getPeerID(HOST, PORT) // get the peerID of this port
    Singleton.setPeerID(peerID) // set peerID in singleton
    Singleton.setPort(PORT) // set port in singleton
    Singleton.setHost(HOST) // set host in singleton

    console.log(`This peer address is ${HOST}:${PORT} located at ${peerName} [${peerID}]`)

    peer.on("connection", (socket) => { // handle new connections

        P2PHandler.handleClientJoining(socket) // handle client joining (this will create welcome message)

        socket.on('data', (data) => {
            // handle hello message
            P2PHandler.handleIncomingData(data, socket.remotePort, socket.remoteAddress)
            socket.end() // close the port
        })

        socket.on('error', () => {

        })

        socket.on('close', () => {

        })

    })

}else{
 
    let peerName = arguments[3]
    Singleton.setPeerName(peerName)

    /*-------------------- Check name for port assigning ------------------------*/
    switch(peerName){
        case "peer1":
            PORT = 2011;
            break;
        case "peer2":
            PORT = 2013;
            break;
        case "peer3":
            PORT = 2087;
            break;
        case "peer4":
            PORT = 2045;
            break;
    }
    /*-------------------- END ------------------------*/

        // This is for all newly joining peers once the first peer has been set up
    let address = arguments[5].split(":") // split the address based on ip address and port
    let connectionAddress = address[0]
    let connectionPort = parseInt(address[1])

    // create new connection with peer connection port and address
    const peer = net.createConnection({
        port: connectionPort,
        host: connectionAddress,
        localPort: PORT,
    }, () => {
        // get the address of the connection
        let address = peer.address()

        console.log(`Connected to peer1:${peer.remotePort} at timestamp: ${Singleton.getTimestamp()}\n`)

        HOST = address.address
        PORT = address.port

        let peerID = Helpers.getPeerID(HOST, PORT) // getting the peer ID
        Singleton.setPeerID(peerID) // setting the peer ID

        // //Test this out
        // P2PHandler.pushBucket(Singleton.getPeers,{
        //     address: HOST,
        //     port: PORT
        // })
        console.log(`This peer is ${address.address}:${address.port} located at ${peerName} [${peerID}]`)
    })

    peer.on('data', (data) => {

        /*----------------------------------- Handle image transfer packet --------------------------------- */
        // Handle message
        let helloPromise = new Promise(async (resolve, reject) => {
            let isHello = await P2PHandler.handleIncomingData(data, connectionPort, connectionAddress);
            console.log(isHello);
            //Check if we send a hello
            if(isHello[0]){
                console.log('sending hellur');
                resolve();
            } else if(!isHello[0]) {
                console.log('no hellur');
                reject();
            }
        }).then(() => {
            // send hello packet on current connection
            let packetToSend = KADP2PPackets.createPacket(2) // get hello packet
            peer.write(packetToSend) // for the already existing connection
            peer.end()
        }).catch(() => {
            console.log('are we here yet');
            let pkt = ITPpacket.init(
                9, // version
                3, // forward to originator
                Singleton.getSequenceNumber(), // sequencepeer1/P2PHandler.js number
                Singleton.getTimestamp(), // timestamp
                isHello[1], // image data
              );
            peer.write(pkt);
            peer.end()
        });
        /*----------------------------------- END --------------------------------- */
    })

    peer.on('error', (err) => {
        console.log('An error occured: ', err)
    })

    peer.on('close', () => {

        // set current PORT and HOST in singleton
        Singleton.setPort(PORT)
        Singleton.setHost(HOST)

        let DHTCopy = JSON.parse(JSON.stringify(Singleton.getPeers())) // make a shallow copy of peers
        // remove peer1 from list of connections as it has already been sent in the intial connection
            for (const [k, row] of Object.entries(DHTCopy)){
                if (row.address === connectionAddress && row.port === connectionPort){
                    delete DHTCopy[k]
                }
            }
        
        P2PHandler.sendHello(DHTCopy) // send hello to all the remaining peers in the DHT

        // listener
        const server = net.createServer()
        server.listen(PORT, HOST)

        server.on("connection", (socket) => { // handle new connections

            socket.on('data', (data) => {
                // handling incoming data
                P2PHandler.handleIncomingData(data, socket.remotePort, socket.remoteAddress)
                socket.end() // end server
            })

            socket.on('error', () => {
                console.log('ERROR')
            })

            socket.on('close', () => {

            })

        })

    })

}






