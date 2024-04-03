module.exports = {
    
    // This prints all of the peers in a DHT
    // Each peer should contain a hashmap with address, port, and nodeID
    printDHT: function(peers){
        if(peers.length > 0){
            peers.forEach((peer) => {
                console.log(`[ P${peer.prefix}, ${peer.address}:${peer.port}, ${peer.nodeID}]`)
            })
        }else{
            console.log('[]')
        }
    },
    printReceivedDHT: function(peers){
        if(peers.length > 0){
            peers.forEach((peer) => {
                console.log(`[${peer.address}:${peer.port}, ${peer.nodeID}]`)
            })
        }else{
            console.log('[]')
        }
    },
    // ------------
    // Count matches assuming string is already XOR
    // ------------
    getXORMatchingLength: function(binStr){
        let count = 0
        while (count < binStr.length && binStr[count] == "0"){
            count += 1
        }
        return count
    },

    //--------------------------
    //Hex2Bin: convert Hex string into binary string
    //--------------------------
    Hex2Bin: function (hex) {
        var bin = ""
        hex.split("").forEach(str => {
            bin += parseInt(str, 16).toString(2).padStart(4, '0')
        })
        return bin
    },

    //--------------------------
    //XORing: finds the XOR of the two Binary Strings with the same size
    //--------------------------
    XORing: function (a, b){
    let ans = "";
        for (let i = 0; i < a.length ; i++)
        {
            // If the Character matches
            if (a[i] == b[i])
                ans += "0";
            else
                ans += "1";
        }
        return ans;
    },

    // get peer ID
    getPeerID: function (IP, PORT) {
        let crypto = require('crypto')
        let sha256 = crypto.createHash('shake256',{outputLength:4})
        sha256.update(IP + ':' + PORT)
        return sha256.digest('hex') // need a new object each time since digest can only be run once
    },

      getKeyID: function (fileName) {
        fileName = fileName.toLowerCase();
        let crypto = require('crypto')
        let sha256 = crypto.createHash('shake256',{outputLength:4})      
        sha256.update(fileName)
        return sha256.digest('hex') // need a new object each time since digest can only be run once
    },

    // Create a port from 3001 to 5000
    getRandomPort(){
        return Math.floor(2000 * Math.random()) + 3001
    },

    // Converts byte array to string
    bytesToString: function (array) {
        var result = "";
        for (var i = 0; i < array.length; ++i) {
            result += String.fromCharCode(array[i]);
        }
        return result;
    },

    // Prints the entire packet in bits format
    printPacketBit: function (packet) {
        var bitString = "";

        for (var i = 0; i < packet.length; i++) {
            // To add leading zeros
            var b = "00000000" + packet[i].toString(2);
            // To print 4 bytes per line
            if (i > 0 && i % 4 == 0) bitString += "\n";
            bitString += " " + b.substr(b.length - 8);
        }
        console.log(bitString);
    },

    // Returns the integer value of the extracted bits fragment for a given packet
    parseBitPacket: function (packet, offset, length) {
        let number = "";
        for (var i = 0; i < length; i++) {
            // let us get the actual byte position of the offset
            let bytePosition = Math.floor((offset + i) / 8);
            let bitPosition = 7 - ((offset + i) % 8);
            let bit = (packet[bytePosition] >> bitPosition) % 2;
            number = (number << 1) | bit;
        }
        return number;
    },

    // Convert a given string to byte array
    stringToBytes: function (str) {
        var ch, st, re = [];
        for (var i = 0; i < str.length; i++) {
        ch = str.charCodeAt(i); // get char
        st = []; // set up "stack"
        do {
            st.push(ch & 0xff); // push byte to stack
            ch = ch >> 8; // shift value down by 1 byte
        } while (ch);
            // add stack contents to result
            // done because chars have "wrong" endianness
            re = re.concat(st.reverse());
        }
        // return an array of bytes
        return re;
    },

    // Store integer value into specific bit poistion the packet
    storeBitPacket: function(packet, value, offset, length) {
        // let us get the actual byte position of the offset
        let lastBitPosition = offset + length - 1;
        let number = value.toString(2); // converts a number to a string in binary
        let j = number.length - 1;
        for (var i = 0; i < number.length; i++) {
            let bytePosition = Math.floor(lastBitPosition / 8);
            let bitPosition = 7 - (lastBitPosition % 8);
            if (number.charAt(j--) == "0") {
                packet[bytePosition] &= ~(1 << bitPosition);
            } else {
                packet[bytePosition] |= 1 << bitPosition;
            }
            lastBitPosition--;
        }
    }  
}