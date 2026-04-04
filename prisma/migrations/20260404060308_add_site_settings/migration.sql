-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "confirmationFields" TEXT NOT NULL DEFAULT '["service","provider","date","time","name","phone"]',
    "colorTheme" TEXT NOT NULL DEFAULT 'blue',
    "customPrimary" TEXT NOT NULL DEFAULT '#2563EB',
    "customAccent" TEXT NOT NULL DEFAULT '#06B6D4',

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
