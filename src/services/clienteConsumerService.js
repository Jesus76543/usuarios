import amqp from "amqplib";
import dotenv from "dotenv";
import User from "../models/userModel.js";
import { userCreatedEvent } from "./rabbitServiceEvent.js";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RABBITMQ_EXCHANGE = "cliente_event";
const RABBITMQ_QUEUE = "cliente_to_user_queue";
const RABBITMQ_ROUTING_KEY = "cliente.created";

export async function startClienteConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL); // Usar solo RABBITMQ_URL
    const channel = await connection.createChannel();

    // Declarar exchange
    await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });
    
    // Declarar cola
    const queue = await channel.assertQueue(RABBITMQ_QUEUE, { durable: true });
    
    // Vincular cola al exchange con la routing key
    await channel.bindQueue(queue.queue, RABBITMQ_EXCHANGE, RABBITMQ_ROUTING_KEY);
    
    console.log(`✅ Esperando mensajes en cola ${RABBITMQ_QUEUE}`);
    
    channel.consume(queue.queue, async (msg) => {
      if (msg !== null) {
        try {
          const clienteData = JSON.parse(msg.content.toString());
          console.log("Datos de cliente recibidos:", clienteData);
          
          // Verificar si el usuario ya existe
          const existingUser = await User.findOne({ 
            where: { 
              username: clienteData.username 
            }
          });

          if (existingUser) {
            console.log(`Usuario con email ${clienteData.username} ya existe, omitiendo creación.`);
            channel.ack(msg);
            return;
          }

          // Crear el usuario directamente con el modelo
          const newUser = await User.create({
            username: clienteData.username,
            phone: clienteData.phone,
            password: clienteData.password,
            status: true,
            creationDate: new Date()
          });
          
          console.log(`✅ Usuario creado automáticamente desde cliente: ID=${newUser.id}`);
          
          // Publicar evento para el servicio de email
          await userCreatedEvent({
            id: newUser.id,
            username: newUser.username,
            phone: newUser.phone,
            creationDate: newUser.creationDate
          });
          
          channel.ack(msg);
        } catch (error) {
          console.error("Error procesando mensaje de cliente:", error);
          // Intentamos reencolar después de un tiempo si es un error temporal
          setTimeout(() => {
            channel.nack(msg, false, true);
          }, 5000);
        }
      }
    }, { noAck: false });
    
    // Manejar cierre de conexión
    connection.on("close", () => {
      console.error("Conexión a RabbitMQ cerrada, reintentando en 5 segundos...");
      setTimeout(startClienteConsumer, 5000);
    });
    
    return { connection, channel };
  } catch (error) {
    console.error("Error conectando a RabbitMQ:", error);
    console.log("Reintentando en 5 segundos...", error);
    setTimeout(startClienteConsumer, 5000);
  }
}