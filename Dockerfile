# Use the official n8n image as the base
FROM n8nio/n8n:latest

# Declare volume to persist workflows and credentials
VOLUME ["/home/node/.n8n"]

# Switch to root to install dependencies and adjust permissions
USER root

# Create a directory for custom node development
RUN mkdir -p /home/n8n-node && chown -R node:node /home/n8n-node
WORKDIR /home/n8n-node

# Copy package files and install dependencies as root
COPY package.json .
COPY package-lock.json .
RUN npm ci

# Copy the custom node source code and build it
COPY ./ ./
RUN npm run build
RUN npm link

# Prepare the custom extensions directory and set ownership
RUN mkdir -p /home/custom && chown -R node:node /home/custom
ENV N8N_CUSTOM_EXTENSIONS="/home/custom"
WORKDIR /home/custom

# Create a fresh Node.js project and link the custom package
RUN npm init -y
RUN npm link axelor-n8n

# Set ownership again (npm may create files as root)
RUN chown -R node:node /home/node /home/custom /home/n8n-node

# Drop back to non-root user for running the container securely
USER node
