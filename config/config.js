var G = require('./../../config/config.json');

G.redisServers = [
    {
        host:"localhost",
        port:30000,
        slots:"1,2,3-10,100"
    },
    {
        port:30001,
        slots:"11,12,13"
    }
    ,
    {
        port:30002,
    }
    ,
    {
        port:30003,
        slots:"16000-16383"
    }
]

module.exports = G;