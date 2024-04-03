function getID (Name) {
    let crypto = require('crypto')
    let sha1 = crypto.createHash('shake256',{outputLength:4})//crypto.createHash('sha1')
    sha1.update(Name)
    return sha1.digest('hex') // need a new object each time since digest can only be run once
}

function Hex2Bin (hex) {
    var bin = ""
    hex.split("").forEach(str => {
        bin += parseInt(str, 16).toString(2).padStart(4, '0')
    })
    return bin
}

 function getXORMatchingLength(binStr){
    let count = 0
    while (count < binStr.length && binStr[count] == "0"){
        count += 1
    }
    return count
}

 function getPeerID(IP, PORT) {
    let crypto = require('crypto')
    let sha1 = crypto.createHash('shake256',{outputLength:4})//crypto.createHash('sha1')
    sha1.update(IP + ':' + PORT)
    return sha1.digest('hex') // need a new object each time since digest can only be run once
}


//--------------------------
//XORing: finds the XOR of the two Binary Strings with the same size
//--------------------------
function XORing (a, b){
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
}

//let imageArr = [{img:"Canna.gif", id:0},{img:"Flicker.jpeg", id:0},{img:"CherryBlossom.gif", id:0},{img:"Parrot.jpeg", id:0},{img:"Cardinal.jpeg", id:0}];
let imageArr = [{img:"Canna.gif", id:0, peer:0, peerId:0, dif:0},{img:"Flicker.jpeg", id:0, peer:0, peerId:0, dif:0},{img:"CherryBlossom.gif", id:0, peer:0, peerId:0, dif:0},{img:"Parrot.jpeg", id:0, peer:0, peerId:0, dif:0},{img:"Cardinal.jpeg", id:0, peer:0, peerId:0, dif:0}];

let peerDB2 = [{
    name: '127.0.0.1:2021', id:0},
    {name: '127.0.0.1:2003', id:0},
    {name: '127.0.0.1:2087', id:0},
    {name: '127.0.0.1:2044', id:0},
    {name: '127.0.0.1:2998', id:0},
]
let peerDB = [{
    name: 'peer1', id:0},
    {name: 'peer1010', id:0},
    {name: 'peer3', id:0},
    {name: 'peer44', id:0},
    {name: 'peer0', id:0},
]

imageArr.map(obj=>{obj.id=Hex2Bin(getID(obj.img))})
peerDB.map(obj=>{obj.id=Hex2Bin(getID(obj.name))})
peerDB2.map(obj=>{obj.id=Hex2Bin(getID(obj.name))})

imageArr.forEach(item=>console.log(`${item.img} ${item.id}`));
peerDB2.forEach(item=>console.log(`${item.name} ${item.id}`));

imageArr.map(obj=>{
    

    let ind=0;

        for( i=0;i<peerDB.length;i++)
        {
            if(getXORMatchingLength(XORing(obj.id.toString(), peerDB2[i].id.toString()))>obj.dif)
                {
                    obj.dif=getXORMatchingLength(XORing(obj.id.toString(), peerDB2[i].id.toString()));
                    ind=i;
                }
        }
    obj.peer=peerDB2[ind].name;
    obj.peerId=peerDB2[ind].id;

    })

    imageArr.forEach(item=>console.log(`${item.img}  ${item.peer}  ${item.dif}`));
