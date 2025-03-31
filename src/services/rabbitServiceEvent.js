import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

const RABBITMQ_URL = process.env.RABBIT_HOST;
const RABBITMQ_EXCHANGE = "user_event";
const RABBITMQ_ROUTING_KEY = "user.created";
const EMAIL_QUEUE = "user_create_queue";

export async function userCreatedEvent(user) {
  const connection = await amqp.connect({
    protocol: 'amqp',
    hostname: process.env.RABBITMQ_HOST, // Debe ser "rabbitmq" en Docker
    port: 5672,
    username: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASS
  });
  const channel = await connection.createChannel();

  try {
    // Declare exchange
    await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });

    // Publicar el evento para cualquier consumidor interesado en usuarios creados
    const message = JSON.stringify(user);
    channel.publish(
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEY,
      Buffer.from(message)
    );

    // Asegurarse de que la cola de email exista
    await channel.assertQueue(EMAIL_QUEUE, { durable: true });

    // Enviar directamente a la cola de email para notificación
    channel.sendToQueue(
      EMAIL_QUEUE,
      Buffer.from(message),
      { persistent: true }
    );

    console.log(
      `[✅] Evento de usuario creado publicado en exchange "${RABBITMQ_EXCHANGE}" y cola "${EMAIL_QUEUE}"`
    );
  } catch (error) {
    console.error("Error al publicar evento de usuario:", error);
  } finally {
    setTimeout(() => {
      connection.close();
    }, 500);
  }
}