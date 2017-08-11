# The name of the extension.
extension_name := aaa

# The zip application to be used.
ZIP := zip

# The target location of the build and build files.
bin_dir := ../bin

# The target XPI file.
xpi_file := $(bin_dir)/$(extension_name).xpi

# The temporary location where the extension tree will be copied and built.
build_dir := $(bin_dir)/build

# This builds the extension XPI file.
.PHONY: all
all: $(xpi_file)
	@echo
	@echo "Build finished successfully."
	@echo

# This cleans all temporary files and directories created by 'make'.
.PHONY: clean
clean:
	@rm -rf $(build_dir)
	@rm -f $(xpi_file)
	@echo "Cleanup is done."

# The sources for the XPI file. Uses variables defined in the included
# Makefiles.
xpi_built := manifest.json \
						 background.js \
             $(wildcard scripts/*.js) \
						 $(wildcard button/*.png)

$(xpi_file): $(xpi_built)
	@echo "Creating XPI file."
	@$(ZIP) $(xpi_file) $(xpi_built)
	@echo "Creating XPI file. Done!"
