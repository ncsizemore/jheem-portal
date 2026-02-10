#!/bin/bash
# Full Baltimore generation with ALL 16 facets from orchestration config
docker run --rm \
  -v /Users/cristina/wiley/Documents/jheem-container-minimal/simulations:/app/simulations \
  -v /Users/cristina/wiley/Documents/jheem-portal/generated-data/baltimore-full:/output \
  849611540600.dkr.ecr.us-east-1.amazonaws.com/jheem-ryan-white-model:latest \
  batch \
  --city C.12580 \
  --scenarios cessation,brief_interruption,prolonged_interruption \
  --outcomes incidence,diagnosed.prevalence,suppression,testing,prep.uptake,awareness,rw.clients,adap.clients,non.adap.clients,oahs.clients,adap.proportion,oahs.suppression,adap.suppression,new \
  --statistics mean.and.interval,median.and.interval \
  --facets 'none,age,race,sex,risk,age+race,age+sex,age+risk,race+sex,race+risk,sex+risk,age+race+sex,age+race+risk,age+sex+risk,race+sex+risk,age+race+sex+risk' \
  --output-dir /output \
  --output-mode data
