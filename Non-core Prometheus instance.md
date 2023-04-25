# Core/Non-core Prometheus instance

## Scheme of consul autodiscovery for NA region

Prometheus buttom is clickable.

### DCA19 cluster

mermaid
flowchart LR
    classDef planned fill:#f96
    subgraph CA-dca19 [DCA19]
        NonCoreDCA19---us10
        NonCoreDCA19---us12
    end

    subgraph NonCoreDCA19[non-core]
        PrometheusNonCoreDCA19(prometheus)-->rcv_dca19
        PrometheusNonCoreDCA19(prometheus)-->rcv-uptc-dca19
        PrometheusNonCoreDCA19(prometheus)-->rcv_dca09-up-pro
    end
    
    subgraph us10[us-10]
        p-us-10-dca08(us-10-dca08-prom)-->rcv-us-10-dca08
        p-us-10-dca09(us-10-dca09-prom)-->rcv-us-10-dca09
        p-us-10-dca10(us-10-dca10-prom)-->rcv-us-10-dca10
    end
    
    subgraph us12[us-12]
        p-us-12-dca08(us-10-dca08-prom)-->rcv-us-12-dca08
        p-us-12-dca09(us-10-dca09-prom)-->rcv-us-12-dca09
        p-us-12-dca10(us-10-dca10-prom)-->rcv-us-12-dca10
    end
    
    subgraph rcv_dca19 [RCV]
        iad01---iad41
        dca08---dca09---dca10
        pdx10---pdx11---pdx12
        sin02
    end
    
    subgraph rcv-uptc-dca19 [RCV-UPTC]
        iad41-uptc[iad41]
    end
    
    subgraph rcv_dca09-up-pro [UP-PRO]
        iad41-up-pro[iad41]
        iad02
        iad01-up-pro[iad01]
        ord01
        sin02-up-pro[sin02]
    end
    
    subgraph rcv-us-10-dca08 [RCV-US-10]
        us-10-dca08[dca08]
    end
    
    subgraph rcv-us-10-dca09 [RCV-US-10]
        us-10-dca09[dca09]
    end
    
    subgraph rcv-us-10-dca10 [RCV-US-10]
        us-10-dca10[dca10]
    end
    
    subgraph rcv-us-12-dca08 [RCV-US-12]
        us-12-dca08[dca08]
    end
    
    subgraph rcv-us-12-dca09 [RCV-US-12]
        us-12-dca09[dca09]
    end
    
    subgraph rcv-us-12-dca10 [RCV-US-12]
        us-12-dca10[dca10]
    end
    
    click PrometheusNonCoreDCA19 "http://prometheus-non-core-dca19.dca19.pro.rcv.int.ringcentral.com" _blank
    click p-us-10-dca08 "http://prometheus-us-10-dca08.dca19.pro.rcv.int.ringcentral.com" _blank
    click p-us-10-dca09 "http://prometheus-us-10-dca09.dca19.pro.rcv.int.ringcentral.com" _blank
    click p-us-10-dca10 "http://prometheus-us-10-dca10.dca19.pro.rcv.int.ringcentral.com" _blank
    click p-us-12-dca08 "http://prometheus-us-12-dca08.dca19.pro.rcv.int.ringcentral.com" _blank
    click p-us-12-dca09 "http://prometheus-us-12-dca09.dca19.pro.rcv.int.ringcentral.com" _blank
    click p-us-12-dca10 "http://prometheus-us-12-dca10.dca19.pro.rcv.int.ringcentral.com" _blank

### CMH09 cluster

mermaid
flowchart LR
    classDef planned fill:#f96
    subgraph CA-cmh09 [cmh09]
        NonCoreCMH09---us14
        NonCoreCMH09---us15
    end

    subgraph NonCoreCMH09[non-core]
        PrometheusNonCoreCMH09(prometheus)-->rcv_cmh09
        PrometheusNonCoreCMH09(prometheus)-->rcv-uptc-cmh09
        PrometheusNonCoreCMH09(prometheus)-->rcv_cmh09-up-pro
    end
    
    subgraph us14[us-14]
        p-us-14-cmh05(us-14-cmh05-prom)-->rcv-us-14-cmh05
        p-us-14-cmh06(us-14-cmh06-prom)-->rcv-us-14-cmh06
        p-us-14-cmh07(us-14-cmh07-prom)-->rcv-us-14-cmh07
    end
    
    subgraph us15[us-15]
        p-us-15-cmh05(us-15-cmh05-prom)-->rcv-us-15-cmh05
        p-us-15-cmh06(us-15-cmh06-prom)-->rcv-us-15-cmh06
        p-us-15-cmh07(us-15-cmh07-prom)-->rcv-us-15-cmh07
    end
    
    subgraph rcv_cmh09 [RCV]
        sjc01
        cmh05---cmh06---cmh07
        yul07---yul08---yul09
        nrt02
    end
    subgraph rcv-uptc-cmh09 [RCV-UPTC]
        sjc01-uptc[sjc01]
    end
    
    subgraph rcv_cmh09-up-pro [UP-PRO]
        sjc01-up-pro[sjc01]
        sjc31
        nrt02-up-pro[nrt02]
    end
    
    subgraph rcv-us-14-cmh05 [RCV-US-14]
        us-14-cmh05[cmh05]
    end
    
    subgraph rcv-us-14-cmh06 [RCV-US-14]
        us-14-cmh06[cmh06]
    end
    
    subgraph rcv-us-14-cmh07 [RCV-US-14]
        us-14-cmh07[cmh07]
    end
    
    subgraph rcv-us-15-cmh05 [RCV-US-15]
        us-15-cmh05[cmh05]
    end
    
    subgraph rcv-us-15-cmh06 [RCV-US-15]
        us-15-cmh06[cmh06]
    end
    
    subgraph rcv-us-15-cmh07 [RCV-US-15]
        us-15-cmh07[cmh07]
    end
    
    click PrometheusNonCoreCMH09 "http://prometheus-non-core-cmh09.cmh09.pro.rcv.int.ringcentral.com" _blank
    click p-us-14-cmh05 "http://prometheus-us-14-cmh05.cmh09.pro.rcv.int.ringcentral.com" _blank
    click p-us-14-cmh06 "http://prometheus-us-14-cmh06.cmh09.pro.rcv.int.ringcentral.com" _blank
    click p-us-14-cmh07 "http://prometheus-us-14-cmh07.cmh09.pro.rcv.int.ringcentral.com" _blank
    click p-us-15-cmh05 "http://prometheus-us-15-cmh05.cmh09.pro.rcv.int.ringcentral.com" _blank
    click p-us-15-cmh06 "http://prometheus-us-15-cmh06.cmh09.pro.rcv.int.ringcentral.com" _blank
    click p-us-15-cmh07 "http://prometheus-us-15-cmh07.cmh09.pro.rcv.int.ringcentral.com" _blank

## Scheme of consul autodiscovery for EU region

### FRA17 Cluster

mermaid
flowchart LR
    classDef planned fill:#f96
    subgraph CA-fra17 [fra17]
        NonCoreFRA17---eu04
    end

    subgraph NonCoreFRA17[non-core]
        PrometheusNonCoreFRA17(prometheus)-->rcv_fra17
        PrometheusNonCoreFRA17(prometheus)-->rcv-uptc-fra17
        PrometheusNonCoreFRA17(prometheus)-->rcv_fra17-up-pro
    end
    
    subgraph eu04[eu-05]
        p-eu-05-fra14(eu-05-fra14-prom)-->rcv-eu-05-fra14
        p-eu-05-fra15(eu-05-fra15-prom)-->rcv-eu-05-fra15
    end
    
    subgraph rcv_fra17 [RCV-ATOS]
        fra01
        fra14
        fra15
        fra25
    end
    subgraph rcv-uptc-fra17 [RCV-UPTC]
        zrh01-uptc[zrh01]
    end
    
    subgraph rcv_fra17-up-pro [UP-PRO]
        fra01-up-pro[fra01]
        zrh01-up-pro[zrh01]
    end
    
    subgraph rcv-eu-05-fra14 [RCV-EU-05]
        eu-05-fra14[fra14]
    end
    
    subgraph rcv-eu-05-fra15 [RCV-EU-05]
        eu-05-fra15[fra15]
    end
    
    click PrometheusNonCoreFRA17 "http://prometheus-non-core-fra17.fra17.pro.rcv.int.ringcentral.com" _blank
    click p-eu-05-fra14 "http://prometheus-eu-05-fra14.fra17.pro.rcv.int.ringcentral.com" _blank
    click p-eu-05-fra15 "http://prometheus-eu-05-fra15.fra17.pro.rcv.int.ringcentral.com" _blank

### STR05 cluster

mermaid
flowchart LR
    subgraph CA-str05 [str05]
        NonCoreSTR05
    end

    subgraph NonCoreSTR05[non-core]
        PrometheusNonCoreSTR05(prometheus)-->rcv_str05
        PrometheusNonCoreSTR05(prometheus)-->rcv-uptc-str05
        PrometheusNonCoreSTR05(prometheus)-->rcv_str05-up-pro
    end
    
    subgraph rcv_str05 [RCV-ATOS]
        ams01
        lhr09
        lhr10
        lhr11
    
    end
    subgraph rcv-uptc-str05 [RCV-UPTC]
        ams01-uptc[ams01]
    end
    
    subgraph rcv_str05-up-pro [UP-PRO]
        ams01-up-pro[ams01]
    end
    
    click PrometheusNonCoreSTR05 "http://prometheus-non-core-str05.str05.pro.rcv.int.ringcentral.com" _blank# Core/Non-core Prometheus instance
    ## Scheme of consul autodiscovery for NA region
    Prometheus buttom is clickable.
    ### DCA19 cluster 
    mermaid
    flowchart LR
        classDef planned fill:#f96
        subgraph CA-dca19 [DCA19]
            NonCoreDCA19---us10
            NonCoreDCA19---us12
        end
    
        subgraph NonCoreDCA19[non-core]
            PrometheusNonCoreDCA19(prometheus)-->rcv_dca19
            PrometheusNonCoreDCA19(prometheus)-->rcv-uptc-dca19
            PrometheusNonCoreDCA19(prometheus)-->rcv_dca09-up-pro
        end
    
        subgraph us10[us-10]
            p-us-10-dca08(us-10-dca08-prom)-->rcv-us-10-dca08
            p-us-10-dca09(us-10-dca09-prom)-->rcv-us-10-dca09
            p-us-10-dca10(us-10-dca10-prom)-->rcv-us-10-dca10
        end
    
        subgraph us12[us-12]
            p-us-12-dca08(us-10-dca08-prom)-->rcv-us-12-dca08
            p-us-12-dca09(us-10-dca09-prom)-->rcv-us-12-dca09
            p-us-12-dca10(us-10-dca10-prom)-->rcv-us-12-dca10
        end
    
        subgraph rcv_dca19 [RCV]
            iad01---iad41
            dca08---dca09---dca10
            pdx10---pdx11---pdx12
            sin02
        end
    
        subgraph rcv-uptc-dca19 [RCV-UPTC]
            iad41-uptc[iad41]
        end
        
        subgraph rcv_dca09-up-pro [UP-PRO]
            iad41-up-pro[iad41]
            iad02
            iad01-up-pro[iad01]
            ord01
            sin02-up-pro[sin02]
        end
    
        subgraph rcv-us-10-dca08 [RCV-US-10]
            us-10-dca08[dca08]
        end
    
        subgraph rcv-us-10-dca09 [RCV-US-10]
            us-10-dca09[dca09]
        end
    
        subgraph rcv-us-10-dca10 [RCV-US-10]
            us-10-dca10[dca10]
        end
    
        subgraph rcv-us-12-dca08 [RCV-US-12]
            us-12-dca08[dca08]
        end
    
        subgraph rcv-us-12-dca09 [RCV-US-12]
            us-12-dca09[dca09]
        end
    
        subgraph rcv-us-12-dca10 [RCV-US-12]
            us-12-dca10[dca10]
        end
    
        click PrometheusNonCoreDCA19 "http://prometheus-non-core-dca19.dca19.pro.rcv.int.ringcentral.com" _blank
        click p-us-10-dca08 "http://prometheus-us-10-dca08.dca19.pro.rcv.int.ringcentral.com" _blank
        click p-us-10-dca09 "http://prometheus-us-10-dca09.dca19.pro.rcv.int.ringcentral.com" _blank
        click p-us-10-dca10 "http://prometheus-us-10-dca10.dca19.pro.rcv.int.ringcentral.com" _blank
        click p-us-12-dca08 "http://prometheus-us-12-dca08.dca19.pro.rcv.int.ringcentral.com" _blank
        click p-us-12-dca09 "http://prometheus-us-12-dca09.dca19.pro.rcv.int.ringcentral.com" _blank
        click p-us-12-dca10 "http://prometheus-us-12-dca10.dca19.pro.rcv.int.ringcentral.com" _blank
    
    ### CMH09 cluster
    mermaid
    flowchart LR
        classDef planned fill:#f96
        subgraph CA-cmh09 [cmh09]
            NonCoreCMH09---us14
            NonCoreCMH09---us15
        end
    
        subgraph NonCoreCMH09[non-core]
            PrometheusNonCoreCMH09(prometheus)-->rcv_cmh09
            PrometheusNonCoreCMH09(prometheus)-->rcv-uptc-cmh09
            PrometheusNonCoreCMH09(prometheus)-->rcv_cmh09-up-pro
        end
    
        subgraph us14[us-14]
            p-us-14-cmh05(us-14-cmh05-prom)-->rcv-us-14-cmh05
            p-us-14-cmh06(us-14-cmh06-prom)-->rcv-us-14-cmh06
            p-us-14-cmh07(us-14-cmh07-prom)-->rcv-us-14-cmh07
        end
        
        subgraph us15[us-15]
            p-us-15-cmh05(us-15-cmh05-prom)-->rcv-us-15-cmh05
            p-us-15-cmh06(us-15-cmh06-prom)-->rcv-us-15-cmh06
            p-us-15-cmh07(us-15-cmh07-prom)-->rcv-us-15-cmh07
        end
    
        subgraph rcv_cmh09 [RCV]
            sjc01
            cmh05---cmh06---cmh07
            yul07---yul08---yul09
            nrt02
        end
        subgraph rcv-uptc-cmh09 [RCV-UPTC]
            sjc01-uptc[sjc01]
        end
    
        subgraph rcv_cmh09-up-pro [UP-PRO]
            sjc01-up-pro[sjc01]
            sjc31
            nrt02-up-pro[nrt02]
        end
    
        subgraph rcv-us-14-cmh05 [RCV-US-14]
            us-14-cmh05[cmh05]
        end
    
        subgraph rcv-us-14-cmh06 [RCV-US-14]
            us-14-cmh06[cmh06]
        end
    
        subgraph rcv-us-14-cmh07 [RCV-US-14]
            us-14-cmh07[cmh07]
        end
    
        subgraph rcv-us-15-cmh05 [RCV-US-15]
            us-15-cmh05[cmh05]
        end
    
        subgraph rcv-us-15-cmh06 [RCV-US-15]
            us-15-cmh06[cmh06]
        end
    
        subgraph rcv-us-15-cmh07 [RCV-US-15]
            us-15-cmh07[cmh07]
        end
    
        click PrometheusNonCoreCMH09 "http://prometheus-non-core-cmh09.cmh09.pro.rcv.int.ringcentral.com" _blank
        click p-us-14-cmh05 "http://prometheus-us-14-cmh05.cmh09.pro.rcv.int.ringcentral.com" _blank
        click p-us-14-cmh06 "http://prometheus-us-14-cmh06.cmh09.pro.rcv.int.ringcentral.com" _blank
        click p-us-14-cmh07 "http://prometheus-us-14-cmh07.cmh09.pro.rcv.int.ringcentral.com" _blank
        click p-us-15-cmh05 "http://prometheus-us-15-cmh05.cmh09.pro.rcv.int.ringcentral.com" _blank
        click p-us-15-cmh06 "http://prometheus-us-15-cmh06.cmh09.pro.rcv.int.ringcentral.com" _blank
        click p-us-15-cmh07 "http://prometheus-us-15-cmh07.cmh09.pro.rcv.int.ringcentral.com" _blank
    
    
    ## Scheme of consul autodiscovery for EU region
    ### FRA17 Cluster
    mermaid
    flowchart LR
        classDef planned fill:#f96
        subgraph CA-fra17 [fra17]
            NonCoreFRA17---eu04
        end
    
        subgraph NonCoreFRA17[non-core]
            PrometheusNonCoreFRA17(prometheus)-->rcv_fra17
            PrometheusNonCoreFRA17(prometheus)-->rcv-uptc-fra17
            PrometheusNonCoreFRA17(prometheus)-->rcv_fra17-up-pro
        end
    
        subgraph eu04[eu-05]
            p-eu-05-fra14(eu-05-fra14-prom)-->rcv-eu-05-fra14
            p-eu-05-fra15(eu-05-fra15-prom)-->rcv-eu-05-fra15
        end
        
        subgraph rcv_fra17 [RCV-ATOS]
            fra01
            fra14
            fra15
            fra25
        end
        subgraph rcv-uptc-fra17 [RCV-UPTC]
            zrh01-uptc[zrh01]
        end
    
        subgraph rcv_fra17-up-pro [UP-PRO]
            fra01-up-pro[fra01]
            zrh01-up-pro[zrh01]
        end
    
        subgraph rcv-eu-05-fra14 [RCV-EU-05]
            eu-05-fra14[fra14]
        end
    
        subgraph rcv-eu-05-fra15 [RCV-EU-05]
            eu-05-fra15[fra15]
        end
    
        click PrometheusNonCoreFRA17 "http://prometheus-non-core-fra17.fra17.pro.rcv.int.ringcentral.com" _blank
        click p-eu-05-fra14 "http://prometheus-eu-05-fra14.fra17.pro.rcv.int.ringcentral.com" _blank
        click p-eu-05-fra15 "http://prometheus-eu-05-fra15.fra17.pro.rcv.int.ringcentral.com" _blank
    
    ### STR05 cluster 
    mermaid
    flowchart LR
        subgraph CA-str05 [str05]
            NonCoreSTR05
        end
    
        subgraph NonCoreSTR05[non-core]
            PrometheusNonCoreSTR05(prometheus)-->rcv_str05
            PrometheusNonCoreSTR05(prometheus)-->rcv-uptc-str05
            PrometheusNonCoreSTR05(prometheus)-->rcv_str05-up-pro
        end
        
        subgraph rcv_str05 [RCV-ATOS]
            ams01
            lhr09
            lhr10
            lhr11
    
        end
        subgraph rcv-uptc-str05 [RCV-UPTC]
            ams01-uptc[ams01]
        end
    
        subgraph rcv_str05-up-pro [UP-PRO]
            ams01-up-pro[ams01]
        end
    
        click PrometheusNonCoreSTR05 "http://prometheus-non-core-str05.str05.pro.rcv.int.ringcentral.com" _blank
