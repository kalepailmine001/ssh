FROM php:cli

# Install dependencies
RUN apt-get update && \
    apt-get install -y tmate openssh-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Default command starts a tmate session
CMD ["tmate", "-F"]
