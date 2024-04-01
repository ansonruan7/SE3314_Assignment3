const TIMESTAMP_RESET = 2**32

let sequenceNumber,
    timestamp,
    peerID,
    peerName,
    host,
    port,
    images = {};
    peers = {};

/*
Example:
0: {
    address: x
    port: x
    id: x
},
*/


module.exports = {
    init: function(){
        // init timestamp
        timestamp = Math.floor(1000 * Math.random())
        // set timestamp interval with max number
        setInterval(() => {
            timestamp = (timestamp + 1) % TIMESTAMP_RESET 
        })
        // init sequence number
        sequenceNumber = Math.floor(1000 * Math.random())
    },

    getSequenceNumber: function() {
        // get sequence number and increment
        sequenceNumber++;
        return sequenceNumber;
    },

    // getters and setters below

    getTimestamp: function() {
        return timestamp
    },

    setPeerID: function(id){
        peerID = id;
    },

    getPeerID: function(){
        return peerID
    },

    getPeers: function(){
        return peers;
    },

    setPeerName: function(name){
        peerName = name
    },

    getPeerName: function(){
        return peerName;
    },

    getHost: function(){
        return host;
    },
    
    setHost: function(h){
        host = h;
    },

    getPort: function(){
        return port;s
    },
    
    setPort: function(p){
        port = p;
    },

    setImage: function(key, name){
        images[key] = name;
    },

    getImage: function(){
        return images;
    },
}
