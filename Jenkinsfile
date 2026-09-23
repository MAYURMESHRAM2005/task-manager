pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'taskflow-backend'
        CONTAINER_NAME = 'taskflow-backend'
        PORT = '8080'
        GIT_COMMIT_SHORT = sh(script: "echo \${GIT_COMMIT:0:7}", returnStdout: true).trim()
    }

    tools {
        jdk 'jdk17'
        maven 'maven3'
    }

    stages {
        // ── Stage 1: Checkout ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        // ── Stage 2: Build backend ────────────────────────────────────────
        stage('Backend Build') {
            steps {
                echo 'Compiling Spring Boot backend...'
                dir('backend') {
                    sh 'mvn -B -DskipTests clean package'
                }
            }
        }

        // ── Stage 3: Backend tests ────────────────────────────────────────
        stage('Backend Tests') {
            steps {
                echo 'Running backend integration tests...'
                dir('backend') {
                    sh 'mvn -B test'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        // ── Stage 4: Build the React frontend ─────────────────────────────
        stage('Frontend Build') {
            steps {
                echo 'Installing dependencies and building the React frontend...'
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        // ── Stage 5: Build Docker image ───────────────────────────────────
        stage('Build Docker Image') {
            steps {
                echo "Building Docker image: ${DOCKER_IMAGE}:${env.BUILD_NUMBER}"
                sh "docker build -t ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ./backend"
                sh "docker build -t taskflow-frontend:${env.BUILD_NUMBER} ./frontend"
                sh "docker tag ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ${DOCKER_IMAGE}:latest"
                sh "docker tag ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ${DOCKER_IMAGE}:${GIT_COMMIT_SHORT}"
            }
        }

        // ── Stage 6: Deploy ───────────────────────────────────────────────
        stage('Deploy') {
            steps {
                echo 'Deploying application...'
                sh """
                    if [ \$(docker ps -q -f name=${CONTAINER_NAME}) ]; then
                        docker stop ${CONTAINER_NAME} || true
                        docker rm ${CONTAINER_NAME} || true
                    fi
                """
                sh """
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        -p ${PORT}:8080 \
                        --restart unless-stopped \
                        ${DOCKER_IMAGE}:${env.BUILD_NUMBER}
                """
            }
        }

        // ── Stage 7: Health check ─────────────────────────────────────────
        stage('Health Check') {
            steps {
                echo 'Waiting for the backend to start...'
                sh 'sleep 15'
                sh """
                    curl -f http://localhost:${PORT}/api/v1/health || exit 1
                    curl -f http://localhost:${PORT}/api/v1/ready || exit 1
                """
                echo 'Backend is healthy!'
            }
        }

        // ── Stage 8: Verification ─────────────────────────────────────────
        stage('Post-Deployment Verification') {
            steps {
                echo 'Verifying deployment...'
                sh """
                    docker ps | grep ${CONTAINER_NAME}
                    echo "Backend: http://localhost:${PORT}"
                    echo "Image tags: ${DOCKER_IMAGE}:${env.BUILD_NUMBER}, ${DOCKER_IMAGE}:${GIT_COMMIT_SHORT}, ${DOCKER_IMAGE}:latest"
                """
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            sh """
                if [ \$(docker ps -q -f name=${CONTAINER_NAME}) ]; then
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                fi
            """
        }
    }
}
