const User = require("./models/User");
const Place = require("./models/Place");
const Booking = require("./models/Booking");

const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");

const jwtSecretKey = "HelloMyNameIsPremILoveWebDevelopment";

// const mu = (MONGO_URL =
//   "mongodb+srv://shindeprem228:Shindeprem@228@cluster0.wjxgdpv.mongodb.net/mydemodb/?retryWrites=true&w=majority&appName=Cluster0");
require("dotenv").config();
const bcrypt = require("bcryptjs");

const bcryptSalt = bcrypt.genSaltSync(10);
// console.log(mu);
// console.log(process.env.MONGO_URL);

// mongoose.connect(
//   "mongodb+srv://shindeprem228:Shindeprem228@cluster0.wjxgdpv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
// );

mongoose.connect("mongodb://127.0.0.1:27017/bookingdb");

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

app.get("/test", (req, res) => {
  res.send("This is test");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });

    res.json(userDoc);
  } catch (e) {
    console.log(e);
    res.status(422).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });

  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign(
        { email: userDoc.email, id: userDoc._id },
        jwtSecretKey,
        {},
        (err, token) => {
          if (err) throw err;

          res.cookie("token", token).json(userDoc);
        }
      );
    } else {
      res.status(422).json("Incorrect Password");
    }
  } else {
    res.status(422).json("User Not Found");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecretKey, {}, async (err, userData) => {
      if (err) throw err;
      const { _id, name, email } = await User.findById(userData.id).exec();
      res.json({ _id, name, email });
    });
  } else {
    res.json(null);
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

app.post("/upload-by-link", async (req, res) => {
  const newName = "photo" + Date.now() + ".jpg";
  const { link } = req.body;
  await imageDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  });
  res.json(newName);
});

const photosMiddleware = multer({ dest: "uploads/" });
app.post("/upload", photosMiddleware.array("photos", 100), (req, res) => {
  const uploadedFiles = [];

  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    uploadedFiles.push(newPath.replace("uploads", ""));
  }
  res.json(uploadedFiles);
});

app.post("/places", async (req, res) => {
  const {
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;

  const { token } = req.cookies;
  jwt.verify(token, jwtSecretKey, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.create({
      owner: userData.id,
      title,
      address,
      photos: addedPhotos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    });
    res.json(placeDoc);
  });
});

app.get("/user-places", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, jwtSecretKey, {}, async (err, userData) => {
    const { id } = userData;
    const places = await Place.find({ owner: id });
    res.json(places);
  });
});

app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  const placeData = await Place.findById(id);
  res.json(placeData);
});

app.put("/places", async (req, res) => {
  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;

  const { token } = req.cookies;

  jwt.verify(token, jwtSecretKey, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.findById(id);
    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
      });
      await placeDoc.save();
      res.json("OK");
    }
  });
});

app.get("/places", async (req, res) => {
  const places = await Place.find();
  res.json(places);
});

app.post("/booking", async (req, res) => {
  const userData = await getUserDataFromRequest(req);
  const { placeId, checkIn, checkOut, noOfGuests, name, mobile, price } =
    req.body;

  try {
    const bookingDoc = await Booking.create({
      place: placeId,
      user: userData.id,
      checkIn,
      checkOut,
      noOfGuests,
      name,
      mobile,
      price,
    });
    res.json(bookingDoc);
  } catch (e) {
    res.json("Error in inserting data to booking collection");
    console.log("Error in inserting data to booking collection" + e);
  }
});

function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecretKey, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}

app.get("/bookings", async (req, res) => {
  const userData = await getUserDataFromRequest(req);
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

app.post("/checkAvailability", async (req, res) => {
  let { currId, checkIn, checkOut } = req.body;
  try {
    if (
      isNaN(new Date(checkIn).getTime()) ||
      isNaN(new Date(checkOut).getTime())
    ) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const existingBooking = await Booking.findOne({
      place: currId,
      // checkIn: new Date(checkIn),
      // checkOut: new Date(checkOut),
      $or: [
        {
          checkIn: { $lte: new Date(checkOut) }, // Start of booking is before end of requested range
          checkOut: { $gte: new Date(checkIn) }, // End of booking is after start of requested range
        },
        {
          checkIn: { $gte: new Date(checkIn) }, // Start of booking is within requested range
          checkOut: { $lte: new Date(checkOut) }, // End of booking is within requested range
        },
      ],
    });

    console.log(existingBooking);
    console.log(currId);

    if (existingBooking) {
      return res.status(400).json({
        message: "Place is already booked for the selected dates",
        existingBooking,
      });
    } else {
      res.status(200).json({ message: "Place is available" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.listen("4000", () => {
  console.log("Listening at 4000");
});
