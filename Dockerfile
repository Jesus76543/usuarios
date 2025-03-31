#Usar imagen base de node
FROM node:18

#Establecer directorio de trabajo dentro del contenedor
WORKDIR /app

#Copiar archivos package.json y package-lock.json para instalar dependencias
COPY package*.json ./

#Instalar dependencias
RUN npm install

#Copiar codigo fuente al contenedor
COPY . .

#Exponer puerto en donde se corre el servicio
EXPOSE 5000

#Comando para iniciar al servicio
CMD ["node", "index.js"]
