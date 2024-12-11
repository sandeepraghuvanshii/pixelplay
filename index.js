const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const Movies = require("./models/Movies");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const API_KEY = "49693e06af50fd1224e138b9fe12bf5f";

dotenv.config();

const app = express();

// Middleware to parse JSON requests with a larger limit
app.use(express.json({ limit: "10mb" }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Endpoint to search movies by query
app.get("/api/movies/search", async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie`,
      {
        params: {
          api_key: API_KEY,
          query: query,
          include_adult: false,
          language: "en-US",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

// Endpoint to fetch all movies and credits from MongoDB
app.get("/api/movies", async (req, res) => {
  try {
    const allMoviesWithCredits = await Movies.find();

    // Respond with the found data
    res.json(allMoviesWithCredits);
  } catch (error) {
    console.error("Error fetching movies and credits:", error);
    res.status(500).json({ error: "Failed to fetch movies and credits" });
  }
});
// Endpoint to fetch movie details and credits by ID
app.get("/api/movies/:id", async (req, res) => {
  const movieId = req.params.id;

  try {
    // Fetch movie details
    const movieResponse = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}`,
      {
        params: {
          api_key: API_KEY,
          language: "en-US",
        },
      }
    );

    // Fetch movie credits
    const creditsResponse = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}/credits`,
      {
        params: {
          api_key: API_KEY,
        },
      }
    );

    // Combine both responses
    const combinedResponse = {
      movie: movieResponse.data,
      credits: creditsResponse.data,
    };

    res.json(combinedResponse);
  } catch (error) {
    console.error("Error fetching movie details or credits:", error);
    res.status(500).json({ error: "Failed to fetch movie details or credits" });
  }
});
// Endpoint to save movie and credits to MongoDB
app.post("/api/movies/save", async (req, res) => {
  const { movie, credits } = req.body;

  if (!movie || !credits) {
    return res
      .status(400)
      .json({ error: "Movie and credits data are required" });
  }

  try {
    // Save combined data to MongoDB
    const movieWithCreditsData = await Movies.findOneAndUpdate(
      { "movie.id": movie.id },
      {
        movie: movie,
        credits: credits,
      },
      { upsert: true, new: true }
    );

    // Respond with the saved data
    res.json(movieWithCreditsData);
  } catch (error) {
    console.error("Error saving movie and credits:", error);
    res.status(500).json({ error: "Failed to save movie and credits" });
  }
});
// New endpoint to fetch movie and credits by title
app.get("/api/movies/title/:title", async (req, res) => {
  const movieTitle = req.params.title;

  try {
    const movieWithCreditsData = await Movies.findOne({
      "movie.title": new RegExp(movieTitle, "i"),
    });

    if (!movieWithCreditsData) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Respond with the found data
    res.json(movieWithCreditsData);
  } catch (error) {
    console.error("Error fetching movie and credits by title:", error);
    res.status(500).json({ error: "Failed to fetch movie and credits" });
  }
});
// New endpoint to update any part of the movie data
app.patch("/api/movies/update/:id", async (req, res) => {
  const movieId = req.params.id;
  const updateData = req.body; // This will contain the fields to update

  try {
    // Find the movie by ID and update it with the provided data
    const updatedMovie = await Movies.findOneAndUpdate(
      { "movie.id": movieId },
      { $set: updateData }, // Use $set to update only the fields provided
      { new: true } // Return the updated document
    );

    if (!updatedMovie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Respond with the updated data
    res.json(updatedMovie);
  } catch (error) {
    console.error("Error updating movie data:", error);
    res.status((500).json({ error: "Failed to update movie data" }));
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
