import app from "./src/app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT_EXPRESS;
app.listen(PORT, () => {
    console.log(`✅Servidor corriendo en el puerto ${process.env.PORT_EXPRESS}`);
});