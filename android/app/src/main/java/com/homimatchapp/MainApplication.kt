package com.homimatchapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.soloader.SoLoader
import com.facebook.react.soloader.OpenSourceMergedSoMapping

class MainApplication : Application(), ReactApplication {

    // Host clásico de React Native (sin ReactHost, ni new arch obligatoria)
    override val reactNativeHost: ReactNativeHost =
        object : ReactNativeHost(this) {

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override fun getPackages(): List<ReactPackage> {
                // Autolink de paquetes
                val packages = PackageList(this).packages

                // Si necesitas añadir paquetes manuales, hazlo aquí:
                // packages.add(GoogleSigninPackage())

                return packages
            }

            override fun getJSMainModuleName(): String = "index"
        }

    override fun onCreate() {
        super.onCreate()

        // ⚠️ IMPORTANTE para RN >= 0.76:
        // usar el merged mapping para que pueda resolver libreact_featureflagsjni.so
        SoLoader.init(this, OpenSourceMergedSoMapping)

        // Si tienes IS_NEW_ARCHITECTURE_ENABLED en true y quieres usarla,
        // aquí podrías llamar a DefaultNewArchitectureEntryPoint.load()
        // pero no es obligatorio si estás en arquitectura clásica.
    }
}
