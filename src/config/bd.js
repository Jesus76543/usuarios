import dotenv from "dotenv";
import { Sequelize } from "sequelize";
dotenv.config();

const sequelize = new Sequelize(process.env.MYSQL_URL, {
  dialect: "mysql",
  logging: false, // Se puede activar para ver las consultas SQL
});

// Añadir a los archivos de configuración de la base de datos
const connectWithRetry = async (maxRetries = 5, retryInterval = 5000) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log("✅ Conexión a la base de datos establecida");
      return true;
    } catch (error) {
      retries++;
      console.error(`❌ Intento ${retries}/${maxRetries} fallido: ${error.message}`);
      console.log(`Reintentando en ${retryInterval / 1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  
  console.error("⛔ No se pudo conectar a la base de datos después de múltiples intentos");
  return false;
};

connectWithRetry();

export default sequelize;