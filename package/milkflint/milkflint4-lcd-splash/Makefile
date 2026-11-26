include $(TOPDIR)/rules.mk

PKG_NAME:=milkflint4-lcd-splash
PKG_VERSION:=1.0.1
PKG_RELEASE:=1
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/milkflint4-lcd-splash
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=MilkFlint4 Flint 4 LCD boot splash
  DEPENDS:=@TARGET_mediatek_filogic
endef

define Package/milkflint4-lcd-splash/description
  Paints the MilkFlint4 logo on the GL-BE14000 front-panel framebuffer
  after boot and leaves it on screen.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) ./src/* $(PKG_BUILD_DIR)/
endef

define Build/Compile
	$(TARGET_CC) $(TARGET_CFLAGS) $(TARGET_LDFLAGS) -Wall -O2 \
		-o $(PKG_BUILD_DIR)/lcd-splash $(PKG_BUILD_DIR)/lcd-splash.c
endef

define Package/milkflint4-lcd-splash/install
	$(INSTALL_DIR) $(1)/usr/libexec/milkflint
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/lcd-splash $(1)/usr/libexec/milkflint/
	$(INSTALL_DIR) $(1)/usr/share/milkflint4
	$(INSTALL_DATA) ./files/lcd-splash.rgb565 $(1)/usr/share/milkflint4/
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/milkflint4-lcd-splash.init $(1)/etc/init.d/milkflint4-lcd-splash
endef

$(eval $(call BuildPackage,milkflint4-lcd-splash))
