FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache bash netcat-openbsd wget

# Definir diretório de trabalho
WORKDIR /app

# Copiar script wait-for-it
COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Construir aplicação
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando para iniciar em modo desenvolvimento
CMD ["/bin/bash", "-c", "wait-for-it.sh postgres 5432 -- wait-for-it.sh mongodb 27017 -- wait-for-it.sh redis 6379 -- npm run start:dev"] 