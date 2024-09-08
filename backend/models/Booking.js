const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  place: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Place" },
  user: { type: mongoose.Schema.Types.ObjectId, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  noOfGuests: { type: Number, require: true },
  name: { type: String, required: true },
  mobile: { type: Number, required: true },
  price: { type: Number },
});

const BookingModel = mongoose.model("Booking", bookingSchema);

module.exports = BookingModel;
