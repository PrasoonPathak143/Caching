const express = require('express');
const app = express();
const redis = require('redis');
require('dotenv').config();

const mongoose = require('mongoose');

const userModel = require('./models/user-model');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect('mongodb://127.0.0.1:27017/Caching').then(() => {
  console.log('Connected to the database');
});

const client = redis.createClient({
    username: 'default',
    password: process.env.PASSWORD,
    socket: {
        host: process.env.HOST,
        port: process.env.PORT
    }
});

client.on("connect", () => {
    console.log("Connected to Redis");
});

client.connect();

app.post('/create', async (req, res) => {
    const { name, email } = req.body;
    try{
        const user = { name, email };
        const userCreated = await userModel.create(user);
        res.status(201).send({ userCreated });
    }catch(err){
        res.status(400).send({ error: err.message });
    }    
});

app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    try{
        let data = await client.get(`user:profile:${id}`);  // look for data in cache
        if(data){
            console.log('Data from cache');
            return res.send({data: JSON.parse(data)});
        }
        const user = await userModel.findOne({_id: id});  // look for data in database
        if(!user){
            return res.status(404).send({ error: 'User not found' });
        }
        // await client.set(`user:profile:${id}`, JSON.stringify(user));  // set data in cache 
        await client.setEx(`user:profile:${id}`, 5, JSON.stringify(user));   // set data in cache with some expiration time
        // await client.del(`user:profile:${id}`);  // delate data from cache
        res.send({ user });
    }catch(err){
        res.status(400).send({ error: err.message });
    }
});

app.listen(3000);