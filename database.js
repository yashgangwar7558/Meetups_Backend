const express = require('express');
var ExpressCassandra = require('express-cassandra');
// import { uuidFromString } from "express-cassandra"
// const cassandra = require('cassandra-driver');
let cors = require('cors');

app = express()
app.use(cors())
app.use(express.json())

const PORT = 8000;

var models = ExpressCassandra.createClient({
    clientOptions: {
        contactPoints: ['cassandra'],   // 127.0.0.1
        localDataCenter: 'datacenter1',
        protocolOptions: { port: 9042 },
        keyspace: 'testks',
        queryOptions: { consistency: ExpressCassandra.consistencies.one }
        // socketOptions: { readTimeout: 60000 },
        // authProvider: new cassandra.auth.PlainTextAuthProvider('dok-k8ssandra-superuser', 'ZglH3dt8jU2YzoetgXzR')
    },
    ormOptions: {
        defaultReplicationStrategy: {
            class: 'SimpleStrategy',
            replication_factor: 1
        },
        migration: 'safe',
    }
},
    (err) => {
        if (err) {
            console.log(err)
        }
        else {
            console.log("Database successfully connected at port 9042")
        }
    }
);


// SCHEMA
var MyModel = models.loadSchema('meetups_by_city', {
    fields: {
        meetup_id: {
            type: "uuid",
            default: { "$db_function": "uuid()" }
        },
        meetup_title: "text",
        meetup_imageurl: "text",
        meetup_date: "text",
        meetup_city: "text",
        meetup_address: "text",
        meetup_description: "text",
        created: {
            type: "timestamp",
            default: { "$db_function": "toTimestamp(now())" }
        }
    },
    key: [["meetup_city"], "created"],
    clustering_order: { "created": "asc" },
});
MyModel.syncDB(function (err, result) {
    if (err) throw err;
});


// to add new meetup...send all meetup data to cassandra 
app.post("/add-new-meetup", (req, res) => {
    let data = req.body
    console.log(data);
    if (data.title) {
        var instance = new models.instance.meetups_by_city({
            meetup_title: data.title,
            meetup_imageurl: data.imageurl,
            meetup_date: data.date,
            meetup_city: data.city,
            meetup_address: data.address,
            meetup_description: data.description
        });

        instance.save(function (err) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }
            console.log('Yuppiie!');
            res.status(201).json({ message: "data added to table!" })
        });
        MyModel.syncDB(function (err, result) {
            if (err) throw err;
        });
    }
})


// to get all meetups for a particular city
app.get("/cities/:city", (req, res) => {
    const city = req.params.city
    console.log(city);
    models.instance.meetups_by_city.find({ meetup_city: city }, { allow_filter: true, raw: true }, function (err, data) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(data);
        res.send(data)
    });
})


// to get all the cities 
app.get("/cities", (req, res) => {
    models.instance.meetups_by_city.find({}, { select: ['meetup_city as city'], allow_filter: true, distinct: true }, function (err, data) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(data);
        res.send(data)
    });
})


// app.delete("/:uuid/", (req, res) => {
//     console.log(models.uuidFromString(req.params.uuid));
//     models.instance.meetups_by_city.delete({ meetup_city: "NewYork", meetup_id: models.uuidFromString(req.params.uuid) },
//       (err, data) => {
//         if (err) {
//           console.error(err)
//           return;
//         } else {
//           console.log("The data was deleted")
//           res.send(`Data was deleted ${req.params.uuid}`)
//         }
//       }
//     )
//   })


app.get("/hello-world", (req, res) => {
    return res.send("Hello World");
})


app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})



