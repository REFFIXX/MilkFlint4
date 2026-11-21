include $(TOPDIR)/rules.mk

PKG_NAME:=milkflint-ui
PKG_VERSION:=0.5.0
PKG_RELEASE:=2
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/milkflint-ui
  SECTION:=luci
  CATEGORY:=LuCI
  TITLE:=MilkFlint web interface (dashboard and main settings)
  DEPENDS:=+luci-base +luci-theme-footstrap +rpcd +rpcd-mod-ucode +rpcd-mod-iwinfo +uhttpd +uhttpd-mod-ubus \
	+ucode +ucode-mod-fs +ucode-mod-uci +ucode-mod-resolv +ucode-mod-nl80211 +ucode-mod-socket +ethtool +milkflint-rtprio
  PKGARCH:=all
  # the account the dnsproxy for devices sent through a VPN runs as (feature
  # adguardhome): its traffic is marked for the tunnel by its owner
  USERID:=adguardvpn=854:adguardvpn=854
endef

define Package/milkflint-ui/description
  A web interface for the everyday settings, served at the router's address.
  LuCI stays installed for everything else, under "Advanced".
  htdocs/ is built from milkflint/ui/ (pnpm package).
endef

define Package/milkflint-ui/conffiles
/etc/config/milkflint
/etc/milkflint/adguardhome.key
/etc/milkflint/banip-feeds.json
/etc/milkflint/home.json
/etc/milkflint/themes.json
endef

define Build/Compile
endef

# Core files, then each feature's router side by convention
# (files/features/<id>/: rpcd.uc, acl.json, init, uci-defaults, preinit, cgi,
# bin/*, nftables.d/<position>/<chain>/*.nft for fw4's includes,
# hotplug.d/<subsystem>/* for /etc/hotplug.d, licenses/*:
# the license texts of what the feature installs, served at /licenses/<id>/
# for its page to link to and in /usr/share/licenses/<id>). A preinit
# hook runs after preinit restores the config a sysupgrade kept
# (80_mount_root), before anything in /etc/init.d. A cgi is served at
# /cgi-bin/milkflint-<id>.
define Package/milkflint-ui/install
	$(INSTALL_DIR) $(1)/www/milkflint $(1)/www/cgi-bin $(1)/usr/share/rpcd/acl.d $(1)/usr/share/rpcd/ucode \
		$(1)/etc/uci-defaults $(1)/etc/init.d $(1)/usr/libexec/milkflint $(1)/usr/libexec/platform \
		$(1)/etc/hotplug.d/ieee80211 $(1)/etc/hotplug.d/iface $(1)/etc/hotplug.d/net $(1)/lib/preinit $(1)/etc/sysctl.d
	$(CP) ./htdocs/* $(1)/www/milkflint/
	$(INSTALL_BIN) ./files/packet-steering.sh $(1)/usr/libexec/platform/packet-steering.sh
	$(INSTALL_CONF) ./files/flowtable.sysctl $(1)/etc/sysctl.d/20-milkflint-flowtable.conf
	$(INSTALL_DATA) ./files/wifi-aql.hotplug $(1)/etc/hotplug.d/ieee80211/30-milkflint-aql
	$(INSTALL_DATA) ./files/wifi-muru.hotplug $(1)/etc/hotplug.d/ieee80211/32-milkflint-muru
	$(INSTALL_DATA) ./files/wifi-spr.hotplug $(1)/etc/hotplug.d/ieee80211/33-milkflint-spr
	$(INSTALL_DATA) ./files/wifi-twt.hotplug $(1)/etc/hotplug.d/ieee80211/34-milkflint-twt
	$(INSTALL_DATA) ./files/cake-ecn.hotplug $(1)/etc/hotplug.d/iface/12-milkflint-cake-ecn
	$(INSTALL_DATA) ./files/wed-flowtable.hotplug $(1)/etc/hotplug.d/net/30-milkflint-flowtable
	$(INSTALL_DATA) ./files/milkflint.html $(1)/www/milkflint.html
	$(INSTALL_DATA) ./files/acl.json $(1)/usr/share/rpcd/acl.d/milkflint-ui.json
	$(INSTALL_DATA) ./files/rpcd.uc $(1)/usr/share/rpcd/ucode/milkflint
	$(INSTALL_BIN) ./files/uci-defaults.sh $(1)/etc/uci-defaults/90-milkflint-ui
	# Footstrap Monokai milk overlays: ship privately, then copy in postinst so we
	# do not fight luci-theme-footstrap's apk ownership of the same paths.
	$(INSTALL_DIR) $(1)/usr/share/milkflint/luci-footstrap
	$(INSTALL_DATA) ./files/luci-footstrap/cascade.css $(1)/usr/share/milkflint/luci-footstrap/cascade.css
	$(INSTALL_DATA) ./files/luci-footstrap/fs-axes.js $(1)/usr/share/milkflint/luci-footstrap/fs-axes.js
	$(INSTALL_DATA) ./files/luci-footstrap/fs-appearance.js $(1)/usr/share/milkflint/luci-footstrap/fs-appearance.js
	for f in ./files/features/*/; do \
		id=$$$$(basename $$$$f); \
		[ ! -f $$$$f/rpcd.uc ] || $(INSTALL_DATA) $$$$f/rpcd.uc $(1)/usr/share/rpcd/ucode/milkflint-$$$$id; \
		[ ! -f $$$$f/acl.json ] || $(INSTALL_DATA) $$$$f/acl.json $(1)/usr/share/rpcd/acl.d/milkflint-$$$$id.json; \
		[ ! -f $$$$f/init ] || $(INSTALL_BIN) $$$$f/init $(1)/etc/init.d/milkflint-$$$$id; \
		[ ! -f $$$$f/uci-defaults ] || $(INSTALL_BIN) $$$$f/uci-defaults $(1)/etc/uci-defaults/91-milkflint-$$$$id; \
		[ ! -f $$$$f/preinit ] || $(INSTALL_DATA) $$$$f/preinit $(1)/lib/preinit/81_milkflint-$$$$id; \
		[ ! -f $$$$f/cgi ] || $(INSTALL_BIN) $$$$f/cgi $(1)/www/cgi-bin/milkflint-$$$$id; \
		[ ! -d $$$$f/bin ] || $(INSTALL_BIN) $$$$f/bin/* $(1)/usr/libexec/milkflint/; \
		[ ! -d $$$$f/nftables.d ] || { $(INSTALL_DIR) $(1)/usr/share/nftables.d && $(CP) $$$$f/nftables.d/* $(1)/usr/share/nftables.d/; }; \
		[ ! -d $$$$f/hotplug.d ] || { $(INSTALL_DIR) $(1)/etc/hotplug.d && $(CP) $$$$f/hotplug.d/* $(1)/etc/hotplug.d/; }; \
		[ ! -d $$$$f/licenses ] || { $(INSTALL_DIR) $(1)/www/licenses/$$$$id $(1)/usr/share/licenses && $(INSTALL_DATA) $$$$f/licenses/* $(1)/www/licenses/$$$$id/ && $(LN) /www/licenses/$$$$id $(1)/usr/share/licenses/$$$$id; }; \
	done
endef

# Apply Monokai milk Footstrap overlays after luci-theme-footstrap is on the rootfs
# (apk refuses two packages owning the same path).
define Package/milkflint-ui/postinst
#!/bin/sh
root="$${IPKG_INSTROOT}"
src="$${root}/usr/share/milkflint/luci-footstrap"
[ -f "$$src/cascade.css" ] || exit 0
mkdir -p "$${root}/www/luci-static/footstrap" "$${root}/www/luci-static/resources"
cp -f "$$src/cascade.css" "$${root}/www/luci-static/footstrap/cascade.css"
cp -f "$$src/fs-axes.js" "$${root}/www/luci-static/resources/fs-axes.js"
cp -f "$$src/fs-appearance.js" "$${root}/www/luci-static/resources/fs-appearance.js"
endef

$(eval $(call BuildPackage,milkflint-ui))
