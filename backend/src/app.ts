import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./router";

dotenv.config();

const app = express();
app.set("trust proxy", true);

// Configuración de CORS corregida para aceptar credenciales (cookies)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use((req, res, next) => {
    console.log(req.method, req.path, req.body);
    next();
});

app.use("/api", router);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;