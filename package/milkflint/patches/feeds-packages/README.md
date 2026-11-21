# Feed package patches (applied into feeds/ after scripts/feeds update)

Copy into the live feeds tree before building:

```sh
mkdir -p feeds/packages/kernel/v4l2loopback/patches
cp package/milkflint/patches/feeds-packages/v4l2loopback/*.patch \
   feeds/packages/kernel/v4l2loopback/patches/
```
