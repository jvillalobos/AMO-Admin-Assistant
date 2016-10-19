# The name of the extension.
extension_name := aaa

# The UUID of the extension.
extension_uuid := aaa-legacy@xulforge.com

# The name of the profile dir where the extension can be installed.
profile_dir := aaa-dev

# The zip application to be used.
ZIP := zip

# The target location of the build and build files.
bin_dir := ../bin

# The target XPI file.
xpi_file := $(bin_dir)/$(extension_name).xpi

# The type of operating system this make command is running on.
os_type := $(patsubst darwin%,darwin,$(shell echo $(OSTYPE)))

# The location of the extension profile.
ifeq ($(os_type), darwin)
  profile_location := \
    ~/Library/Application\ Support/Firefox/Profiles/$(profile_dir)/extensions/$(extension_uuid)
else
  ifeq ($(os_type), linux-gnu)
    profile_location := \
      ~/.mozilla/firefox/$(profile_dir)/extensions/$(extension_uuid)
  else
    profile_location := \
      "$(subst \,\\,$(APPDATA))\\Mozilla\\Firefox\\Profiles\\$(profile_dir)\\extensions\\$(extension_uuid)"
  endif
endif

# The temporary location where the extension tree will be copied and built.
build_dir := $(bin_dir)/build

# This builds the extension XPI file.
.PHONY: all
all: $(xpi_file)
	@echo
	@echo "Build finished successfully."
	@echo

# This builds the extension XPI file and copies it to a mounted Android device.
.PHONY: android
android: all
	@adb push $(xpi_file) /mnt/sdcard/Download
	@echo "Copied to device."


# This cleans all temporary files and directories created by 'make'.
.PHONY: clean
clean:
	@rm -rf $(build_dir)
	@rm -f $(xpi_file)
	@echo "Cleanup is done."

# The sources for the XPI file. Uses variables defined in the included
# Makefiles.
xpi_built := install.rdf \
             bootstrap.js \
             chrome.manifest \
             $(wildcard scripts/*.js)

$(xpi_file): $(xpi_built)
	@echo "Creating XPI file."
	@$(ZIP) $(xpi_file) $(xpi_built)
	@echo "Creating XPI file. Done!"

.PHONY: install
install: $(xpi_file)
	@echo "Installing in profile folder: $(profile_location)"
	@cp -fL $(xpi_file) $(profile_location)/$(extension_uuid).xpi
	@echo "Installing in profile folder. Done!"
	@echo
