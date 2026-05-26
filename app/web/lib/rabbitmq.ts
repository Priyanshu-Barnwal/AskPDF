import amqp from 'amqplib';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export const QUEUE_NAME = 'document_processing';

export async function getRabbitMQChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  
  if (!connection) {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    connection = await amqp.connect(url);
    
    // Handle disconnects
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      connection = null;
      channel = null;
    });
    
    connection.on('close', () => {
      console.error('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });
  }

  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
  });

  return channel;
}

export async function publishDocumentJob(payload: {
  document_id: string;
  user_id: string;
  s3_key: string;
  created_at: string;
  retry_count: number;
}) {
  const ch = await getRabbitMQChannel();
  ch.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}
