# JHEEM Container Restructuring Plan

**Status:** Draft
**Date:** February 10, 2026
**Scope:** Create shared base image, simplify model containers

---

## Overview

Consolidate ~80% duplicated code across 3 container repos into a shared base image. Model containers become thin wrappers (~30 lines) that add only their workspace creation logic.

### Current State

| Repo | Dockerfile | Purpose |
|------|------------|---------|
| `jheem-container-minimal` | ~220 lines | MSA + AJPH |
| `jheem-ryan-white-croi-container` | ~275 lines | CROI |
| `jheem-cdc-testing-container` | ~244 lines | CDC Testing |

**Duplication:** renv.lock, 6+ R scripts, simulation/, plotting/, 90% of Dockerfile

### Target State

```
ghcr.io/ncsizemore/jheem-base:1.0.0        (~150 lines total)
  ├── ghcr.io/ncsizemore/jheem-ryan-white-model:2.0.0   (~30 lines)
  ├── ghcr.io/ncsizemore/jheem-ryan-white-croi:2.0.0    (~30 lines)
  └── ghcr.io/ncsizemore/jheem-cdc-testing-model:2.0.0  (~30 lines)
```

---

## Phase 1: Create Base Image

### 1.1 Create `jheem-base` Repository

**New repo:** `ncsizemore/jheem-base`

**Contents:**
```
jheem-base/
├── .github/
│   └── workflows/
│       └── build-and-push.yml
├── Dockerfile
├── renv.lock
├── Rprofile.site
├── common/
│   ├── batch_plot_generator.R      # Parameterized version
│   ├── lambda_handler.R
│   ├── plotting_minimal.R
│   ├── extract_summary_data.R
│   ├── restore_jheem2_state.R
│   └── container_entrypoint.sh     # Unified version
├── simulation/
│   └── (current contents)
├── plotting/
│   └── (current contents)
├── tests/
│   └── (current contents)
└── README.md
```

### 1.2 Base Dockerfile

```dockerfile
# =============================================================================
# JHEEM Base Image
# Shared R environment for all JHEEM model containers
# =============================================================================
FROM r-base:4.4.2

# --- System Dependencies ---
RUN apt-get update && apt-get install -y \
    build-essential \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libgit2-dev \
    libgdal-dev \
    libproj-dev \
    zlib1g-dev \
    libicu-dev \
    pkg-config \
    libfreetype6-dev \
    libpng-dev \
    libjpeg-dev \
    libtiff5-dev \
    libtiff6 \
    libjpeg62-turbo \
    libpng16-16 \
    libfreetype6 \
    libfontconfig1-dev \
    libnode-dev \
    libudunits2-dev \
    cmake \
    libabsl-dev \
    default-jdk \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# --- Library Symlinks for RSPM Compatibility ---
RUN ARCH_LIB_DIR=$(dpkg-architecture -q DEB_HOST_MULTIARCH) && \
    # libgit2
    LIBGIT2=$(ls /usr/lib/${ARCH_LIB_DIR}/libgit2.so.* 2>/dev/null | grep -E 'libgit2\.so\.[0-9]+\.[0-9]+$' | head -1) && \
    if [ -n "${LIBGIT2}" ]; then ln -sf "${LIBGIT2}" "/usr/lib/${ARCH_LIB_DIR}/libgit2.so.1.5"; fi && \
    # libnode
    LIBNODE=$(ls /usr/lib/${ARCH_LIB_DIR}/libnode.so.* 2>/dev/null | head -1) && \
    if [ -n "${LIBNODE}" ]; then ln -sf "${LIBNODE}" "/usr/lib/${ARCH_LIB_DIR}/libnode.so.108"; fi && \
    # libgdal
    GDAL=$(ls /usr/lib/${ARCH_LIB_DIR}/libgdal.so.* 2>/dev/null | head -1) && \
    if [ -n "${GDAL}" ]; then ln -sf "${GDAL}" "/usr/lib/${ARCH_LIB_DIR}/libgdal.so.32"; fi

# --- R Configuration ---
RUN R CMD javareconf && \
    R -e "install.packages('pak', repos = 'https://r-lib.github.io/p/pak/stable/')"

WORKDIR /app

# --- R Packages ---
COPY renv.lock Rprofile.site ./
RUN cp Rprofile.site /etc/R/

RUN R -e "pak::pkg_install('renv')" && \
    R -e "renv::init(bare = TRUE)" && \
    echo "source('renv/activate.R')" > .Rprofile

# Install tricky packages from source
RUN R -e "renv::install('units', type = 'source')" && \
    R -e "renv::install('gert', type = 'source')" && \
    R -e "renv::install('V8', type = 'source')" && \
    R -e "renv::install('sf', type = 'source')"

RUN R -e "renv::snapshot(packages = c('units', 'gert', 'V8', 'sf'), update = TRUE)" && \
    R -e "renv::restore()"

# Verify packages
RUN R --slave -e "library(jheem2); library(plotly); library(jsonlite); cat('✅ Base ready\n')"

# --- Common Scripts ---
COPY common/ ./
COPY simulation/ ./simulation/
COPY plotting/ ./plotting/
COPY tests/ ./tests/

RUN chmod +x container_entrypoint.sh

# Base image doesn't have a default command - model images will set ENTRYPOINT
```

### 1.3 Parameterize batch_plot_generator.R

Current difference (4 lines):
```r
# Ryan White version
load("ryan_white_workspace.RData")
cat("✅ RW.SPECIFICATION available:", exists("RW.SPECIFICATION"), "\n")

# CDC Testing version
load("cdc_testing_workspace.RData")
cat("✅ CDCT.SPECIFICATION available:", exists("CDCT.SPECIFICATION"), "\n")
```

**Solution:** Use environment variable or auto-detection:
```r
# Detect workspace file
workspace_files <- list.files(pattern = "_workspace\\.RData$")
if (length(workspace_files) != 1) {
    stop("Expected exactly one workspace file, found: ", paste(workspace_files, collapse=", "))
}
load(workspace_files[1])
cat("✅ Workspace loaded:", workspace_files[1], "\n")
```

### 1.4 Unify container_entrypoint.sh

Merge all modes (batch, lambda, trim, etc.) into single script. The "trim" mode from CROI can be included but only activated if trim_simsets.R exists.

### 1.5 Base Image Build Workflow

```yaml
name: Build Base Image

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/jheem-base

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Phase 2: Migrate Model Containers

### 2.1 New Model Dockerfile Pattern

**Example: `jheem-ryan-white-container/Dockerfile`**

```dockerfile
# =============================================================================
# JHEEM Ryan White Model (MSA + AJPH)
# =============================================================================
ARG BASE_VERSION=1.0.0
FROM ghcr.io/ncsizemore/jheem-base:${BASE_VERSION} AS base

# --- Build workspace ---
FROM base AS workspace-builder

ARG JHEEM_ANALYSES_COMMIT=fc3fe1d2d5f859b322414da8b11f0182e635993b
WORKDIR /app

# Clone jheem_analyses
RUN git clone https://github.com/tfojo1/jheem_analyses.git && \
    cd jheem_analyses && git checkout ${JHEEM_ANALYSES_COMMIT}

# Download cached data
RUN cd jheem_analyses && mkdir -p cached && \
    R --slave -e "load('commoncode/data_manager_cache_metadata.Rdata'); \
    for(f in names(cache.metadata)) cat('wget -O cached/',f,' \"',cache.metadata[[f]][['onedrive.link']],'\"\n',sep='')" \
    | bash

COPY cached/google_mobility_data.Rdata jheem_analyses/cached/
COPY create_workspace.R ./

# Apply path fixes and create workspace
RUN sed -i 's/USE.JHEEM2.PACKAGE = F/USE.JHEEM2.PACKAGE = T/' jheem_analyses/use_jheem2_package_setting.R && \
    sed -i 's|../../cached/ryan.white.data.manager.rdata|../jheem_analyses/cached/ryan.white.data.manager.rdata|' \
    jheem_analyses/applications/ryan_white/ryan_white_specification.R

RUN Rscript create_workspace.R ryan_white_workspace.RData && \
    test -f ryan_white_workspace.RData

# --- Final image ---
FROM base AS final

COPY --from=workspace-builder /app/ryan_white_workspace.RData ./

# Verify
RUN R --slave -e "load('ryan_white_workspace.RData'); \
    cat('✅ Objects:', length(ls()), '\n'); \
    stopifnot(exists('RW.SPECIFICATION'))"

ENTRYPOINT ["./container_entrypoint.sh"]
CMD ["batch"]
```

**That's ~40 lines vs ~220 lines currently.**

### 2.2 Migration Order

1. **Ryan White (MSA + AJPH)** - Most stable, good test case
2. **CDC Testing** - Recently created, cleanest current state
3. **CROI** - Has extra trim mode, migrate last

### 2.3 Rename Repositories

During migration:
- `jheem-container-minimal` → `jheem-ryan-white-container`
- Keep: `jheem-ryan-white-croi-container`
- Keep: `jheem-cdc-testing-container`
- New: `jheem-base`

Update all references in:
- `jheem-backend/models.json`
- Workflow files

---

## Phase 3: Update Workflows

### 3.1 Update models.json

```json
{
  "ryan-white-msa": {
    "container": {
      "image": "ghcr.io/ncsizemore/jheem-ryan-white-model",
      "version": "2.0.0"
    }
  }
}
```

### 3.2 Rebuild Coordination

When base image updates:
1. Tag new base version (e.g., `1.1.0`)
2. Update model Dockerfiles to reference new base
3. Tag new model versions (e.g., `2.1.0`)
4. Update models.json

**Optional automation:** Use GitHub's `repository_dispatch` to trigger model rebuilds when base updates.

---

## Implementation Checklist

### Phase 1: Base Image
- [ ] Create `jheem-base` repository
- [ ] Copy common files from jheem-container-minimal
- [ ] Parameterize batch_plot_generator.R (auto-detect workspace)
- [ ] Unify container_entrypoint.sh
- [ ] Create Dockerfile (Stage 1 only, no workspace)
- [ ] Create build workflow
- [ ] Test: `docker build` succeeds
- [ ] Tag and push `v1.0.0`

### Phase 2: Migrate Ryan White
- [ ] Rename repo: `jheem-container-minimal` → `jheem-ryan-white-container`
- [ ] Replace Dockerfile with thin version (FROM jheem-base)
- [ ] Remove duplicated files (keep only create_workspace.R, cached/)
- [ ] Update build workflow
- [ ] Test: `docker build` succeeds
- [ ] Test: batch mode works with sample data
- [ ] Tag and push `v2.0.0`
- [ ] Update models.json in jheem-backend

### Phase 3: Migrate CDC Testing
- [ ] Replace Dockerfile with thin version
- [ ] Remove duplicated files
- [ ] Test and tag `v2.0.0`
- [ ] Update models.json

### Phase 4: Migrate CROI
- [ ] Replace Dockerfile (include trim_simsets.R if needed)
- [ ] Remove duplicated files
- [ ] Test and tag `v2.0.0`
- [ ] Update models.json

### Phase 5: Cleanup
- [ ] Archive old container code (or just rely on git history)
- [ ] Update documentation in all repos
- [ ] Run full workflow tests for all 4 models
- [ ] Delete deprecated DockerHub/ECR images (optional)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Base update breaks models | Pin base version in model Dockerfiles; test before updating |
| Rename breaks references | Update models.json + workflows atomically |
| Build time increases | Base layer cached; model builds become faster |
| Coordination overhead | Document update process; consider automation |

---

## Success Criteria

- [ ] Base image builds and pushes successfully
- [ ] All 3 model containers build FROM base
- [ ] Model Dockerfiles are <50 lines each
- [ ] All 4 models pass workflow dry-run tests
- [ ] Total Dockerfile lines reduced by 70%+
- [ ] Adding a new model requires only ~40 lines of Dockerfile

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Base image | 2-3 hours |
| Phase 2: Ryan White | 1-2 hours |
| Phase 3: CDC Testing | 1 hour |
| Phase 4: CROI | 1-2 hours |
| Phase 5: Cleanup | 1 hour |
| **Total** | **6-9 hours** |

---

## Open Questions

1. **DockerHub/ECR cleanup:** The original container pushes to 3 registries. Do we want to maintain that for jheem-base, or simplify to ghcr.io only?

2. **Trim mode:** CROI has a "trim" command for preparing web-ready simsets. Include in base, or keep CROI-specific?

3. **jheem_analyses commit:** Each model pins a specific commit. Should base include a default, or always require models to specify?
