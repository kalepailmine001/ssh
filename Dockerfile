# Use Windows Server Core as the base image
FROM debian
RUN apt update && apt install tmate -y
RUN tmate -F
