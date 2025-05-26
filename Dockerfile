FROM localhost/n8n-icon:local

# Persist workflows & credentials
VOLUME ["/home/node/.n8n"]

# Install custom nodes
USER root
RUN mkdir -p /home/n8n-node && chown node:node /home/n8n-node
WORKDIR /home/n8n-node
COPY package*.json ./
ENV NODE_ENV=development
RUN npm ci
COPY . .
RUN npm run build && npm link

# Configure custom extensions
RUN mkdir -p /home/custom && chown node:node /home/custom
ENV N8N_CUSTOM_EXTENSIONS=/home/custom
WORKDIR /home/custom
RUN npm init -y && npm link axelor-n8n

# Restore permissions and switch user
RUN chown -R node:node /home/node /home/n8n-node /home/custom

# Switch back to non-root user and set production mode
USER node
ENV NODE_ENV=production
