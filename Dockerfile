FROM openjdk:11
COPY . /
WORKDIR /
CMD ["java", "-jar", "/results_viewer-1.jar"]
