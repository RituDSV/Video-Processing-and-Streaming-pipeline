#!/bin/bash
set -e

echo "🚀 Deploying video platform to Kubernetes..."

echo "📁 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "⚙️ Applying config and secrets..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

echo "💾 Creating shared volumes..."
kubectl apply -f k8s/uploads-pvc.yaml
kubectl apply -f k8s/processed-pvc.yaml

echo "🐘 Deploying postgres..."
kubectl apply -f k8s/postgres/
kubectl rollout status deployment/postgres -n video-platform

echo "🔴 Deploying redis..."
kubectl apply -f k8s/redis/
kubectl rollout status deployment/redis -n video-platform

echo "🟡 Deploying kafka..."
kubectl apply -f k8s/kafka/
kubectl rollout status deployment/kafka -n video-platform

echo "🔄 Running migrations..."
kubectl delete job migrate -n video-platform --ignore-not-found
kubectl apply -f k8s/migrate/job.yaml
kubectl wait --for=condition=complete job/migrate -n video-platform --timeout=120s

echo "🟢 Deploying api..."
kubectl apply -f k8s/api/
kubectl rollout status deployment/api -n video-platform

echo "🟣 Deploying worker..."
kubectl apply -f k8s/worker/
kubectl rollout status deployment/worker -n video-platform

echo "🔵 Deploying web..."
kubectl apply -f k8s/web/
kubectl rollout status deployment/web -n video-platform

echo "✅ All services deployed successfully!"
kubectl get pods -n video-platform