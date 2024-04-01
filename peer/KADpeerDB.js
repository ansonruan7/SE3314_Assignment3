let net = require("net") // load net for server
let Helpers = require('./Helpers')
let Singleton = require('./Singleton')
let KADP2PPackets = require('./KADP2PPackets')
let P2PHandler = require('./P2PHandler')

// net settings used from assignment 1
net.bytesWritten = 300000;
net.bufferSize = 300000;

// Set up HOST, PORT, and Singleton 
let HOST = '127.0.0.1',
    PORT;
let arguments = process.argv // get current arguments
let peerName = require('path').basename(__dirname) // get the folder name

Singleton.init(); // initialize singleton
Singleton.setPeerName(peerName) // set the peer name in the singleton

/*-------------------- Scan for images and set up key and name ------------------------*/
const fs = require('fs');
const path = require('path');
//Check current directory
fs.readdir('./', (err, files) => {
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
            console.log(Singleton.getImage());
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
    
    const peer = net.createServer() // create server
    peer.listen(PORT, HOST)

    /*-------------------- Create a second server to host image requests ------------------------*/
    const image = net.createServer();
    const PORT_db = Helpers.getRandomPort(); // get a random port to start up server
    image.listen(HOST, PORT_db);
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
        // Handle welcome message
        P2PHandler.handleIncomingData(data, connectionPort, connectionAddress)

        // send hello packet on current connection
        let packetToSend = KADP2PPackets.createPacket(2) // get hello packet
        peer.write(packetToSend) // for the already existing connection

        peer.end()
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






